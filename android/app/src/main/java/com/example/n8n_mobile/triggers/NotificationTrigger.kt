package com.example.n8n_mobile.triggers

import org.json.JSONObject
import java.util.UUID

data class NotificationTrigger(
    val id: String = UUID.randomUUID().toString(),
    val name: String,
    val packageName: String,
    val titleRegex: String = ".*",
    val textRegex: String = ".*",
    val url: String,
    val enabled: Boolean = true,
) {
    fun matches(pkg: String, title: String, text: String): Boolean {
        if (!enabled || pkg != packageName) return false
        return runCatching {
            Regex(titleRegex).containsMatchIn(title) &&
                Regex(textRegex).containsMatchIn(text)
        }.getOrDefault(false)
    }

    fun toJson(): JSONObject = JSONObject().apply {
        put("id", id)
        put("name", name)
        put("packageName", packageName)
        put("titleRegex", titleRegex)
        put("textRegex", textRegex)
        put("url", url)
        put("enabled", enabled)
    }

    companion object {
        fun fromJson(o: JSONObject) = NotificationTrigger(
            id = o.getString("id"),
            name = o.getString("name"),
            packageName = o.getString("packageName"),
            titleRegex = o.optString("titleRegex", ".*"),
            textRegex = o.optString("textRegex", ".*"),
            url = o.getString("url"),
            enabled = o.optBoolean("enabled", true),
        )
    }
}
