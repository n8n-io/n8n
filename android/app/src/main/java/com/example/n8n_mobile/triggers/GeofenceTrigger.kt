package com.example.n8n_mobile.triggers

import org.json.JSONObject
import java.util.UUID

enum class Transition { ENTER, EXIT, BOTH }

data class GeofenceTrigger(
    val id: String = UUID.randomUUID().toString(),
    val name: String,
    val latitude: Double,
    val longitude: Double,
    val radiusM: Float,
    val transition: Transition,
    val workflowId: String,
    val url: String,
    val enabled: Boolean = true,
) {
    fun toJson(): JSONObject = JSONObject().apply {
        put("id", id)
        put("name", name)
        put("latitude", latitude)
        put("longitude", longitude)
        put("radiusM", radiusM.toDouble())
        put("transition", transition.name)
        put("workflowId", workflowId)
        put("url", url)
        put("enabled", enabled)
    }

    companion object {
        fun fromJson(o: JSONObject) = GeofenceTrigger(
            id = o.getString("id"),
            name = o.getString("name"),
            latitude = o.getDouble("latitude"),
            longitude = o.getDouble("longitude"),
            radiusM = o.getDouble("radiusM").toFloat(),
            transition = Transition.valueOf(o.getString("transition")),
            workflowId = o.getString("workflowId"),
            url = o.optString("url", ""),
            enabled = o.optBoolean("enabled", true),
        )
    }
}
