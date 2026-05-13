package com.example.n8n_mobile.triggers

import android.annotation.SuppressLint
import android.app.PendingIntent
import android.content.Context
import android.content.Intent
import android.util.Log
import com.google.android.gms.location.Geofence
import com.google.android.gms.location.GeofencingClient
import com.google.android.gms.location.GeofencingRequest
import com.google.android.gms.location.LocationServices

class GeofenceManager(context: Context) {
    private val appContext = context.applicationContext
    private val client: GeofencingClient = LocationServices.getGeofencingClient(appContext)

    private fun pendingIntent(triggerId: String): PendingIntent {
        val intent = Intent(appContext, GeofenceReceiver::class.java).apply {
            action = ACTION_GEOFENCE_EVENT
            putExtra(EXTRA_TRIGGER_ID, triggerId)
        }
        // Use the triggerId hashCode as request code so each geofence has its own PendingIntent
        return PendingIntent.getBroadcast(
            appContext,
            triggerId.hashCode(),
            intent,
            PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_MUTABLE,
        )
    }

    @SuppressLint("MissingPermission")
    fun register(trigger: GeofenceTrigger) {
        val transitions = when (trigger.transition) {
            Transition.ENTER -> Geofence.GEOFENCE_TRANSITION_ENTER
            Transition.EXIT -> Geofence.GEOFENCE_TRANSITION_EXIT
            Transition.BOTH -> Geofence.GEOFENCE_TRANSITION_ENTER or Geofence.GEOFENCE_TRANSITION_EXIT
        }
        val geofence = Geofence.Builder()
            .setRequestId(trigger.id)
            .setCircularRegion(trigger.latitude, trigger.longitude, trigger.radiusM)
            .setExpirationDuration(Geofence.NEVER_EXPIRE)
            .setTransitionTypes(transitions)
            .build()

        val request = GeofencingRequest.Builder()
            .setInitialTrigger(0)
            .addGeofence(geofence)
            .build()

        client.addGeofences(request, pendingIntent(trigger.id))
            .addOnSuccessListener { Log.d(TAG, "registered ${trigger.id}") }
            .addOnFailureListener { Log.e(TAG, "register failed ${trigger.id}", it) }
    }

    fun unregister(triggerId: String) {
        client.removeGeofences(listOf(triggerId))
            .addOnSuccessListener { Log.d(TAG, "unregistered $triggerId") }
            .addOnFailureListener { Log.e(TAG, "unregister failed $triggerId", it) }
        // Also cancel the PendingIntent so a stale one isn't left around
        pendingIntent(triggerId).cancel()
    }

    companion object {
        private const val TAG = "GeofenceManager"
        const val ACTION_GEOFENCE_EVENT = "com.example.n8n_mobile.GEOFENCE_EVENT"
        const val EXTRA_TRIGGER_ID = "triggerId"
    }
}
