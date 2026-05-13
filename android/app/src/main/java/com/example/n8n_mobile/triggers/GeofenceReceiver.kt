package com.example.n8n_mobile.triggers

import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.util.Log
import com.google.android.gms.location.Geofence
import com.google.android.gms.location.GeofencingEvent
import org.json.JSONObject
import java.net.HttpURLConnection
import java.net.URL
import kotlin.concurrent.thread

class GeofenceReceiver : BroadcastReceiver() {
    override fun onReceive(context: Context, intent: Intent) {
        val event = GeofencingEvent.fromIntent(intent)
        if (event == null || event.hasError()) {
            Log.e(TAG, "geofence event error: ${event?.errorCode}")
            return
        }

        val transition = when (event.geofenceTransition) {
            Geofence.GEOFENCE_TRANSITION_ENTER -> "ENTER"
            Geofence.GEOFENCE_TRANSITION_EXIT -> "EXIT"
            else -> return
        }

        val store = TriggerStore.get(context)
        val pending = goAsync()
        thread(start = true, name = "geofence-post") {
            try {
                event.triggeringGeofences?.forEach { fence ->
                    val trigger = store.get(fence.requestId) ?: return@forEach
                    if (trigger.url.isBlank()) {
                        Log.w(TAG, "trigger ${trigger.id} has no URL, skipping")
                        return@forEach
                    }
                    val body = JSONObject().apply {
                        put("triggerId", trigger.id)
                        put("workflowId", trigger.workflowId)
                        put("event", transition)
                        put("ts", System.currentTimeMillis())
                    }.toString()
                    post(trigger.url, body)
                }
            } catch (e: Exception) {
                Log.e(TAG, "post failed", e)
            } finally {
                pending.finish()
            }
        }
    }

    private fun post(url: String, body: String) {
        val conn = (URL(url).openConnection() as HttpURLConnection).apply {
            requestMethod = "POST"
            doOutput = true
            connectTimeout = 5000
            readTimeout = 5000
            setRequestProperty("Content-Type", "application/json")
        }
        conn.outputStream.use { it.write(body.toByteArray()) }
        Log.d(TAG, "POST $url -> ${conn.responseCode}")
        conn.disconnect()
    }

    companion object {
        private const val TAG = "GeofenceReceiver"
    }
}
