"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const config_1 = require("vitest/config");
const isBrowser = process.env.BROWSER === "true";
exports.default = (0, config_1.defineConfig)({
    test: {
        environment: isBrowser ? "jsdom" : "node",
        dir: "test",
        exclude: ["**/__IGNORED__/**"],
        watch: false,
        globalSetup: isBrowser ? ["./test/fixtures/server.ts"] : undefined,
        testTimeout: 5000,
        globals: true,
        passWithNoTests: true,
        reporters: ["verbose"],
        coverage: { reporter: ["lcov", "html", "text"] },
        snapshotSerializers: ["./test/utils/serializeJson.ts"],
    },
});
