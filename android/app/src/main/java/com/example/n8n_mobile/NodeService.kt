package com.example.n8n_mobile

import android.app.*
import android.content.Context
import android.content.Intent
import android.content.pm.ServiceInfo
import android.os.Build
import android.os.IBinder
import android.system.Os
import android.util.Log
import androidx.core.app.NotificationCompat
import kotlinx.coroutines.*
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import org.apache.commons.compress.archivers.tar.TarArchiveInputStream
import java.io.BufferedInputStream
import java.io.File
import java.io.FilterInputStream
import java.io.InputStream
import java.net.InetSocketAddress
import java.net.Socket
import java.util.zip.GZIPInputStream

object NodeStartupState {
    sealed interface Progress {
        data class Extracting(val percent: Float, val entries: Int) : Progress
        data object Starting : Progress
    }

    private val _progress = MutableStateFlow<Progress?>(null)
    val progress: StateFlow<Progress?> = _progress.asStateFlow()

    internal fun set(p: Progress?) { _progress.value = p }
}

private class CountingInputStream(stream: InputStream) : FilterInputStream(stream) {
    @Volatile var bytesRead: Long = 0L; private set
    override fun read(): Int {
        val b = super.read()
        if (b != -1) bytesRead++
        return b
    }
    override fun read(b: ByteArray, off: Int, len: Int): Int {
        val n = super.read(b, off, len)
        if (n > 0) bytesRead += n
        return n
    }
}

class NodeService : Service() {
    private val scope = CoroutineScope(Dispatchers.IO + SupervisorJob())
    private val channelId = "node_runner"
    private var process: Process? = null

    override fun onBind(intent: Intent?): IBinder? = null

    override fun onCreate() {
        super.onCreate()
        ensureChannel()
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
            startForeground(
                1,
                buildNotification("Starting Node..."),
                ServiceInfo.FOREGROUND_SERVICE_TYPE_DATA_SYNC
            )
        } else {
            startForeground(1, buildNotification("Starting Node..."))
        }
        scope.launch {
            try {
                startServer()
            } catch (e: Throwable) {
                Log.e(TAG, "startup failed", e)
                updateNotification("Startup failed: ${e.message}")
            }
        }
    }

    override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int =
        START_NOT_STICKY

    override fun onDestroy() {
        process?.destroy()
        process = null
        listeningPort = null
        scope.cancel()
        super.onDestroy()
    }

    private fun startServer() {
        updateNotification("Extracting Node project...")
        ensureAssetsExtracted()
        NodeStartupState.set(NodeStartupState.Progress.Starting)
        updateNotification("Starting Node...")

        val projectRoot = File(filesDir, "nodejs-project")
        val entrypoint = File(projectRoot, "bin/n8n")
        val userFolder = File(filesDir, "n8n-data").apply { mkdirs() }

        // sqlite3's prebuilt .node depends on libc++_shared.so, but jniLibs ships it
        // as libcxxshared.so (the name libnode.so was built against). Bridge the names
        // by creating a symlink alias in a writable dir we prepend to LD_LIBRARY_PATH.
        val nativeDir = File(applicationInfo.nativeLibraryDir)
        val libAliasDir = File(filesDir, "lib-aliases").apply { mkdirs() }
        val cxxAlias = File(libAliasDir, "libc++_shared.so")
        if (!cxxAlias.exists()) {
            try {
                Os.symlink(File(nativeDir, "libcxxshared.so").absolutePath, cxxAlias.absolutePath)
            } catch (e: Exception) {
                Log.w(TAG, "libc++_shared.so alias failed", e)
            }
        }

        val env = mapOf(
            "N8N_PORT" to PORT.toString(),
            "N8N_HOST" to "127.0.0.1",
            "N8N_USER_FOLDER" to userFolder.absolutePath,
            "LD_LIBRARY_PATH" to "${libAliasDir.absolutePath}:${nativeDir.absolutePath}",
        )

        Log.d(TAG, "spawning ${entrypoint.absolutePath} with env=$env")
        val p = NodeRunner.start(this, entrypoint, env, cwd = projectRoot)
        process = p

        scope.launch {
            try {
                p.inputStream.bufferedReader().useLines { lines ->
                    for (line in lines) Log.d(TAG, line)
                }
            } catch (e: Exception) {
                Log.e(TAG, "stdout reader crashed", e)
            }
            Log.d(TAG, "node exited code=${runCatching { p.exitValue() }.getOrNull()}")
            stopSelf()
        }

        scope.launch { waitForPortReady(PORT) }
    }

    private suspend fun waitForPortReady(port: Int) {
        // Wait up to 10 minutes — first launch runs all n8n migrations which can take
        // several minutes, then the SPA route registers shortly after listen().
        val deadline = System.currentTimeMillis() + 10 * 60_000L
        while (System.currentTimeMillis() < deadline) {
            try {
                // First a cheap TCP probe so we don't HTTP-spam an unreachable port.
                Socket().use { s -> s.connect(InetSocketAddress("127.0.0.1", port), 200) }
                // Then an HTTP GET to verify the SPA route is actually mounted.
                val conn = (java.net.URL("http://127.0.0.1:$port/").openConnection() as java.net.HttpURLConnection).apply {
                    requestMethod = "GET"
                    connectTimeout = 500
                    readTimeout = 1000
                    instanceFollowRedirects = false
                }
                val code = try { conn.responseCode } finally { conn.disconnect() }
                if (code in 200..399) {
                    onReady(port)
                    return
                }
                Log.d(TAG, "port $port bound but / returned $code, waiting...")
            } catch (_: Exception) {
                // not yet — keep polling
            }
            delay(500)
        }
        Log.e(TAG, "server failed to become ready on $port within 10 minutes")
        updateNotification("Server failed to become ready on $port")
    }

    private fun onReady(port: Int) {
        listeningPort = port
        NodeStartupState.set(null)
        updateNotification("Listening on 127.0.0.1:$port")
        sendBroadcast(
            Intent(ACTION_READY)
                .setPackage(packageName)
                .putExtra(EXTRA_PORT, port)
        )
    }

    private fun ensureAssetsExtracted() {
        val marker = File(filesDir, ".n8n_assets_version")
        if (marker.exists() && marker.readText() == ASSET_VERSION) return
        Log.d(TAG, "extracting nodejs-project.bundle to ${filesDir.absolutePath}")
        val started = System.currentTimeMillis()
        File(filesDir, "nodejs-project").deleteRecursively()

        val totalBytes: Long = try {
            assets.openFd("nodejs-project.bundle").use { it.length }
        } catch (e: Exception) {
            -1L
        }

        NodeStartupState.set(NodeStartupState.Progress.Extracting(0f, 0))

        assets.open("nodejs-project.bundle").use { raw ->
            val counting = CountingInputStream(raw)
            BufferedInputStream(counting).use { buffered ->
                GZIPInputStream(buffered).use { gz ->
                    TarArchiveInputStream(gz).use { tar ->
                        var entry = tar.nextEntry
                        var count = 0
                        while (entry != null) {
                            val outFile = File(filesDir, entry.name)
                            when {
                                entry.isDirectory -> outFile.mkdirs()
                                entry.isSymbolicLink -> {
                                    outFile.parentFile?.mkdirs()
                                    if (outFile.exists()) outFile.delete()
                                    try {
                                        Os.symlink(entry.linkName, outFile.absolutePath)
                                    } catch (e: Exception) {
                                        Log.w(TAG, "symlink ${outFile.absolutePath} -> ${entry.linkName} failed", e)
                                    }
                                }
                                entry.isLink -> {
                                    // Hardlink. linkName is the archive-internal path of the target,
                                    // which we extract under filesDir at the same relative location.
                                    val target = File(filesDir, entry.linkName)
                                    outFile.parentFile?.mkdirs()
                                    if (outFile.exists()) outFile.delete()
                                    try {
                                        Os.link(target.absolutePath, outFile.absolutePath)
                                    } catch (e: Exception) {
                                        // Fallback: copy the bytes. Slower but always works.
                                        try {
                                            target.copyTo(outFile, overwrite = true)
                                        } catch (e2: Exception) {
                                            Log.w(TAG, "hardlink ${outFile.absolutePath} -> ${target.absolutePath} failed", e2)
                                        }
                                    }
                                }
                                else -> {
                                    outFile.parentFile?.mkdirs()
                                    outFile.outputStream().use { tar.copyTo(it) }
                                }
                            }
                            count++
                            if (count % 500 == 0) {
                                val pct = if (totalBytes > 0) counting.bytesRead.toFloat() / totalBytes else 0f
                                NodeStartupState.set(NodeStartupState.Progress.Extracting(pct.coerceIn(0f, 1f), count))
                                if (count % 5000 == 0) Log.d(TAG, "extracted $count entries (${(pct * 100).toInt()}%)")
                            }
                            entry = tar.nextEntry
                        }
                        Log.d(TAG, "extracted $count entries in ${System.currentTimeMillis() - started}ms")
                    }
                }
            }
        }

        marker.writeText(ASSET_VERSION)
    }

    private fun ensureChannel() {
        val mgr = getSystemService(NotificationManager::class.java)
        val ch = NotificationChannel(channelId, "Node Runner", NotificationManager.IMPORTANCE_LOW)
        mgr.createNotificationChannel(ch)
    }

    private fun buildNotification(text: String): Notification =
        NotificationCompat.Builder(this, channelId)
            .setContentTitle("n8n Mobile")
            .setContentText(text)
            .setSmallIcon(android.R.drawable.stat_notify_sync)
            .setOngoing(true)
            .build()

    private fun updateNotification(text: String) {
        val mgr = getSystemService(NotificationManager::class.java)
        mgr.notify(1, buildNotification(text))
    }

    companion object {
        private const val TAG = "NodeServer"
        private const val ASSET_VERSION = "4"
        const val PORT = 8765
        const val ACTION_READY = "com.example.n8n_mobile.READY"
        const val EXTRA_PORT = "port"

        @Volatile
        var listeningPort: Int? = null
            private set

        fun start(context: Context) {
            context.startForegroundService(Intent(context, NodeService::class.java))
        }
    }
}
