package com.example.n8n_mobile

import android.util.Log
import java.net.HttpURLConnection
import java.net.URL
import kotlin.concurrent.thread

object ServerClient {
    @Volatile private var lastForegroundState: Boolean = false

    fun notifyForeground(foreground: Boolean) {
        lastForegroundState = foreground
        pushCurrentState()
    }

    fun refreshState() {
        pushCurrentState()
    }

    private fun pushCurrentState() {
        val port = NodeService.listeningPort ?: return
        val state = lastForegroundState
        thread(start = true, name = "server-state-post") {
            try {
                val conn = (URL("http://127.0.0.1:$port/state").openConnection() as HttpURLConnection).apply {
                    requestMethod = "POST"
                    doOutput = true
                    connectTimeout = 2000
                    readTimeout = 2000
                    setRequestProperty("Content-Type", "application/json")
                }
                conn.outputStream.use { it.write("""{"foreground":$state}""".toByteArray()) }
                Log.d(TAG, "POST /state foreground=$state -> ${conn.responseCode}")
                conn.disconnect()
            } catch (e: Exception) {
                Log.e(TAG, "state post failed", e)
            }
        }
    }

    private const val TAG = "ServerClient"
}
