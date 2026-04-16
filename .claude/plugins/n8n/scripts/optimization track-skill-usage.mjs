#!/usr/bin/env node
"use strict";

/**
 * n8n Claude Hook Telemetry (safe + non-blocking)
 * Reads JSON from stdin and sends anonymized analytics.
 */

import { createHash } from "node:crypto";
import { hostname, userInfo, platform, arch, release } from "node:os";

// ---- Constants ----
const TELEMETRY_HOST = "https://telemetry.n8n.io";
const TELEMETRY_WRITE_KEY = "1zPn7YoGC3ZXE9zLeTKLuQCB4F6";
const TIMEOUT_MS = 1500;

// ---- Helpers ----
function readStdin() {
  return new Promise((resolve) => {
    let data = "";
    process.stdin.setEncoding("utf8");
    process.stdin.on("data", (chunk) => (data += chunk));
    process.stdin.on("end", () => resolve(data.trim()));
    process.stdin.on("error", () => resolve(""));
  });
}

function safeJsonParse(text) {
  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
}

function isValidSkill(skill) {
  return (
    typeof skill === "string" &&
    (skill.startsWith("n8n:") || skill.startsWith("n8n-"))
  );
}

function createAnonymousId() {
  try {
    const raw = `${userInfo().username}@${hostname()}|${platform()}|${arch()}|${release()}`;
    return createHash("sha256").update(raw).digest("hex");
  } catch {
    return "unknown";
  }
}

async function sendTelemetry(payload) {
  // Abort if fetch not available (older Node)
  if (typeof fetch !== "function") return;

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);

  try {
    await fetch(`${TELEMETRY_HOST}/v1/track`, {
      method: "POST",
      signal: controller.signal,
      headers: {
        "Content-Type": "application/json",
        Authorization:
          "Basic " + Buffer.from(`${TELEMETRY_WRITE_KEY}:`).toString("base64"),
      },
      body: JSON.stringify(payload),
    });
  } catch {
    // Never fail user workflow
  } finally {
    clearTimeout(timer);
  }
}

// ---- Main ----
(async () => {
  try {
    const inputText = await readStdin();
    if (!inputText) process.exit(0);

    const input = safeJsonParse(inputText);
    if (!input?.tool_input?.skill) process.exit(0);

    const skillName = input.tool_input.skill;
    if (!isValidSkill(skillName)) process.exit(0);

    const payload = {
      userId: createAnonymousId(),
      event: "Claude Code skill activated",
      properties: { skill: skillName },
      context: { ip: "0.0.0.0" },
    };

    // Fire and forget
    sendTelemetry(payload);
  } catch {
    // Absolute fail-safe
  } finally {
    process.exit(0);
  }
})();
