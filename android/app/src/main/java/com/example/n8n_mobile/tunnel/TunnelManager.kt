package com.example.n8n_mobile.tunnel

import android.content.Context
import android.provider.Settings
import android.util.Log
import com.example.n8n_mobile.BuildConfig
import com.example.n8n_mobile.NodeService
import com.jcraft.jsch.JSch
import com.jcraft.jsch.KeyPair
import com.jcraft.jsch.Session
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.Job
import kotlinx.coroutines.SupervisorJob
import kotlinx.coroutines.delay
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext
import java.io.ByteArrayOutputStream
import java.io.File
import java.security.MessageDigest

object TunnelManager {
    private const val TAG = "TunnelManager"
    private const val SERVER_HOST = "n8n.free-tuna.it"
    private const val SERVER_PORT = 2222
    private const val ROOT_DOMAIN = "n8n.free-tuna.it"
    private const val LOCAL_HTTP_PORT = NodeService.PORT // 8765

    sealed interface Status {
        data object Idle : Status
        data object Connecting : Status
        data class Connected(val url: String) : Status
        data class Error(val message: String) : Status
    }

    private val _status = MutableStateFlow<Status>(Status.Idle)
    val status: StateFlow<Status> = _status.asStateFlow()

    private val _publicKey = MutableStateFlow<String?>(null)
    val publicKey: StateFlow<String?> = _publicKey.asStateFlow()

    private val _subdomain = MutableStateFlow<String?>(null)
    val subdomain: StateFlow<String?> = _subdomain.asStateFlow()

    private val scope = CoroutineScope(Dispatchers.IO + SupervisorJob())
    private var connectJob: Job? = null
    private var session: Session? = null

    private fun keyDir(context: Context) = File(context.filesDir, "ssh").apply { mkdirs() }
    private fun privateKeyFile(context: Context) = File(keyDir(context), "id_rsa")
    private fun publicKeyFile(context: Context) = File(keyDir(context), "id_rsa.pub")

    private fun ensureKeypair(context: Context, jsch: JSch) {
        val priv = privateKeyFile(context)
        val pub = publicKeyFile(context)
        if (priv.exists() && pub.exists()) return

        // RSA-3072 keeps us free of a BouncyCastle runtime dep that JSch's Ed25519 path
        // requires on Android. RSA support is built into JSch's stock providers.
        val pair = KeyPair.genKeyPair(jsch, KeyPair.RSA, 3072)
        priv.outputStream().use { pair.writePrivateKey(it) }
        ByteArrayOutputStream().use { os ->
            pair.writePublicKey(os, "n8n-mobile")
            pub.writeBytes(os.toByteArray())
        }
        pair.dispose()
    }

    /** Stable, short, alphabetic-only — usable as a subdomain label. */
    fun deriveSubdomain(context: Context): String {
        val androidId = Settings.Secure.getString(context.contentResolver, Settings.Secure.ANDROID_ID)
            ?: "unknown"
        val hash = MessageDigest.getInstance("SHA-256").digest(androidId.toByteArray())
        val hex = hash.take(4).joinToString("") { "%02x".format(it) } // 8 hex chars
        return "phone-$hex"
    }

    fun init(context: Context) {
        // Key generation is CPU-bound (~1s on a phone for RSA-3072); never block UI thread.
        scope.launch {
            try {
                val jsch = JSch()
                ensureKeypair(context, jsch)
                _publicKey.value = publicKeyFile(context).readText().trim()
                _subdomain.value = deriveSubdomain(context)
            } catch (e: Throwable) {
                Log.e(TAG, "keypair init failed", e)
                _status.value = Status.Error("Key init failed: ${e.message ?: e.javaClass.simpleName}")
            }
        }
    }

    fun connect(context: Context) {
        if (connectJob?.isActive == true) return
        connectJob = scope.launch {
            _status.value = Status.Connecting
            try {
                val jsch = JSch()
                ensureKeypair(context, jsch)
                jsch.addIdentity(privateKeyFile(context).absolutePath)

                val subdomain = deriveSubdomain(context)
                _subdomain.value = subdomain
                val sub = "$subdomain.$ROOT_DOMAIN"
                // SSH username carries both the subdomain claim and the shared admission
                // token. Authd splits on "__", validates the token, and TOFU-registers
                // the subdomain half against the key fingerprint. The token never appears
                // in the public URL.
                val sshUser = "${subdomain}__${BuildConfig.TUNNEL_TOKEN}"

                val s = jsch.getSession(sshUser, SERVER_HOST, SERVER_PORT).apply {
                    setConfig("StrictHostKeyChecking", "no")
                    setConfig("PreferredAuthentications", "publickey")
                    // sish's idle-connection-timeout is short by default; ping every 3s.
                    serverAliveInterval = 3_000
                    serverAliveCountMax = 5
                }
                s.connect(15_000)
                // Pass subdomain label only — sish appends --domain to it.
                s.setPortForwardingR(subdomain, 80, "127.0.0.1", LOCAL_HTTP_PORT)
                session = s

                val url = "https://$sub"
                _status.value = Status.Connected(url)
                Log.i(TAG, "tunnel open: $url")

                // Keep the coroutine alive while the session is up; if it disconnects, signal idle.
                while (s.isConnected) delay(2000)
                _status.value = Status.Idle
                Log.d(TAG, "tunnel session ended")
            } catch (e: Throwable) {
                Log.e(TAG, "tunnel connect failed", e)
                _status.value = Status.Error(e.message ?: e.javaClass.simpleName)
                session = null
            }
        }
    }

    fun disconnect() {
        connectJob?.cancel()
        connectJob = null
        runCatching { session?.disconnect() }
        session = null
        _status.value = Status.Idle
    }
}
