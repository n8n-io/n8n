package com.example.n8n_mobile.triggers

import android.app.Notification
import android.service.notification.NotificationListenerService
import android.service.notification.StatusBarNotification
import android.util.Log
import org.json.JSONObject
import java.net.HttpURLConnection
import java.net.URL
import kotlin.concurrent.thread

class NotificationListener : NotificationListenerService() {

    override fun onNotificationPosted(sbn: StatusBarNotification) {
        val triggers = NotificationTriggerStore.get(applicationContext).snapshot()
        if (triggers.isEmpty()) return

        val extras = sbn.notification.extras
        val title = extras.getCharSequence(Notification.EXTRA_TITLE)?.toString() ?: ""
        val text = extras.getCharSequence(Notification.EXTRA_TEXT)?.toString()
            ?: extras.getCharSequence(Notification.EXTRA_BIG_TEXT)?.toString()
            ?: ""

        triggers.filter { it.matches(sbn.packageName, title, text) }.forEach { t ->
            val body = JSONObject().apply {
                put("triggerId", t.id)
                put("triggerName", t.name)
                put("packageName", sbn.packageName)
                put("title", title)
                put("text", text)
                put("postTime", sbn.postTime)
                put("tag", sbn.tag ?: "")
            }.toString()
            post(t.url, body)
        }
    }

    private fun post(url: String, body: String) {
        thread(start = true, name = "notif-trigger-post") {
            runCatching {
                val conn = (URL(url).openConnection() as HttpURLConnection).apply {
                    requestMethod = "POST"
                    doOutput = true
                    connectTimeout = 3000
                    readTimeout = 5000
                    setRequestProperty("Content-Type", "application/json")
                }
                conn.outputStream.use { it.write(body.toByteArray()) }
                Log.d(TAG, "POST $url -> ${conn.responseCode}")
                conn.disconnect()
            }.onFailure { Log.e(TAG, "post failed", it) }
        }
    }

    companion object {
        private const val TAG = "NotifListener"
    }
}
