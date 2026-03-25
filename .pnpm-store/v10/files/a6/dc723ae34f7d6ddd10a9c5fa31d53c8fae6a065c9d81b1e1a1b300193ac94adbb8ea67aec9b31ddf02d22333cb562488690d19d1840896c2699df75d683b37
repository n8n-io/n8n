"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.printReporterTable = printReporterTable;
const console_table_printer_1 = require("console-table-printer");
const chalk_1 = __importDefault(require("chalk"));
const os = __importStar(require("node:os"));
const path = __importStar(require("node:path"));
const fs = __importStar(require("node:fs/promises"));
const constants_js_1 = require("./constants.cjs");
const FEEDBACK_COLLAPSE_THRESHOLD = 48;
const MAX_TEST_PARAMS_LENGTH = 18;
const RESERVED_KEYS = [
    "Name",
    "Result",
    "Inputs",
    "Reference Outputs",
    "Outputs",
    "pass",
];
function formatTestName(name, duration) {
    if (duration != null) {
        return `${name} (${duration}ms)`;
    }
    else {
        return name;
    }
}
function getFormattedStatus(status) {
    const s = status.toLowerCase();
    if (s === "pending" || s === "skipped") {
        return chalk_1.default.yellow("○ Skipped");
    }
    else if (s.includes("pass")) {
        return chalk_1.default.green("✓ Passed");
    }
    else if (s.includes("fail")) {
        return chalk_1.default.red("✕ Failed");
    }
    else {
        return status;
    }
}
function getColorParam(status) {
    const s = status.toLowerCase();
    if (s === "pending" || s === "skipped") {
        return { color: "yellow" };
    }
    else if (s.includes("pass")) {
        return { color: "grey" };
    }
    else if (s.includes("fail")) {
        return { color: "red" };
    }
    else {
        return {};
    }
}
function formatValue(value) {
    if (typeof value === "object" && value !== null) {
        return Object.entries(value)
            .map(([k, v]) => {
            const rawValue = typeof v === "string" ? v : JSON.stringify(v);
            const rawEntry = `${k}: ${rawValue}`;
            const entry = rawEntry.length > MAX_TEST_PARAMS_LENGTH
                ? rawEntry.slice(0, MAX_TEST_PARAMS_LENGTH - 3) + "..."
                : rawEntry;
            return entry;
        })
            .join("\n");
    }
    if (value == null) {
        return;
    }
    return String(value);
}
async function printReporterTable(testSuiteName, results, testStatus, failureMessage) {
    const rows = [];
    const feedbackKeys = new Set();
    let experimentUrl;
    for (const result of results) {
        const { title, duration, status } = result;
        const titleComponents = title.split(constants_js_1.TEST_ID_DELIMITER);
        const testId = titleComponents.length > 1 && titleComponents.at(-1) !== undefined
            ? titleComponents.at(-1)
            : undefined;
        const testName = testId !== undefined
            ? titleComponents.slice(0, -1).join(constants_js_1.TEST_ID_DELIMITER).trim()
            : titleComponents.join(constants_js_1.TEST_ID_DELIMITER);
        // Non-LangSmith test
        if (testId === undefined) {
            rows.push([
                {
                    Test: formatTestName(testName, duration),
                    Status: getFormattedStatus(status),
                },
                getColorParam(status),
            ]);
        }
        else if (status === "pending" || status === "skipped") {
            // Skipped
            rows.push([
                {
                    Test: formatTestName(testName, duration),
                    Status: getFormattedStatus(status),
                },
                getColorParam(status),
            ]);
        }
        else {
            const resultsPath = path.join(os.tmpdir(), "langsmith_test_results", `${testId}.json`);
            let fileContent;
            try {
                fileContent = JSON.parse(await fs.readFile(resultsPath, "utf-8"));
                await fs.unlink(resultsPath);
            }
            catch (e) {
                console.log("[LANGSMITH]: Failed to read custom evaluation results. Please contact us for help.");
                rows.push([
                    {
                        Test: formatTestName(testName, duration),
                        Status: getFormattedStatus(status),
                    },
                    getColorParam(status),
                ]);
                continue;
            }
            const feedback = fileContent.feedback.reduce((acc, current) => {
                if (!RESERVED_KEYS.includes(current.key) &&
                    current.score !== undefined) {
                    feedbackKeys.add(current.key);
                    acc[current.key] = current.score;
                }
                return acc;
            }, {});
            experimentUrl = experimentUrl ?? fileContent.experimentUrl;
            rows.push([
                {
                    Test: formatTestName(testName, duration),
                    Inputs: formatValue(fileContent.inputs),
                    "Reference Outputs": formatValue(fileContent.referenceOutputs),
                    Outputs: formatValue(fileContent.outputs),
                    Status: getFormattedStatus(status),
                    ...feedback,
                },
                getColorParam(status),
            ]);
        }
    }
    const feedbackKeysTotalLength = [...feedbackKeys].reduce((l, key) => l + key.length, 0);
    const collapseFeedbackColumn = feedbackKeysTotalLength > FEEDBACK_COLLAPSE_THRESHOLD;
    for (const key of feedbackKeys) {
        const scores = rows
            .map(([row]) => row[key])
            .filter((score) => score !== undefined);
        if (scores.length > 0) {
            const mean = scores.reduce((a, b) => a + b, 0) / scores.length;
            const stdDev = Math.sqrt(scores.reduce((sq, n) => sq + Math.pow(n - mean, 2), 0) / scores.length);
            for (const row of rows) {
                const score = row[0][key];
                if (score !== undefined) {
                    const deviation = (score - mean) / stdDev;
                    let coloredKey;
                    let coloredScore;
                    if (isNaN(deviation)) {
                        coloredKey = chalk_1.default.white(`${key}:`);
                        coloredScore = chalk_1.default.white(score);
                    }
                    else if (deviation <= -1) {
                        coloredKey = chalk_1.default.redBright(`${key}:`);
                        coloredScore = chalk_1.default.redBright(score);
                    }
                    else if (deviation < -0.5) {
                        coloredKey = chalk_1.default.red(`${key}:`);
                        coloredScore = chalk_1.default.red(score);
                    }
                    else if (deviation < 0) {
                        coloredKey = chalk_1.default.yellow(`${key}:`);
                        coloredScore = chalk_1.default.yellow(score);
                    }
                    else if (deviation === 0) {
                        coloredKey = chalk_1.default.white(`${key}:`);
                        coloredScore = chalk_1.default.white(score);
                    }
                    else if (deviation <= 0.5) {
                        coloredKey = chalk_1.default.green(`${key}:`);
                        coloredScore = chalk_1.default.green(score);
                    }
                    else {
                        coloredKey = chalk_1.default.greenBright(`${key}:`);
                        coloredScore = chalk_1.default.greenBright(score);
                    }
                    if (collapseFeedbackColumn) {
                        delete row[0][key];
                        if (row[0].Feedback === undefined) {
                            row[0].Feedback = `${coloredKey} ${coloredScore}`;
                        }
                        else {
                            row[0].Feedback = `${row[0].Feedback}\n${coloredKey} ${coloredScore}`;
                        }
                    }
                    else {
                        row[0][key] = coloredScore;
                    }
                }
            }
        }
    }
    const defaultColumns = [
        { name: "Test", alignment: "left", maxLen: 36 },
        { name: "Inputs", alignment: "left", minLen: MAX_TEST_PARAMS_LENGTH },
        {
            name: "Reference Outputs",
            alignment: "left",
            minLen: MAX_TEST_PARAMS_LENGTH,
        },
        { name: "Outputs", alignment: "left", minLen: MAX_TEST_PARAMS_LENGTH },
        { name: "Status", alignment: "left" },
    ];
    if (collapseFeedbackColumn) {
        const feedbackColumnLength = rows.reduce((max, [row]) => {
            const maxFeedbackLineLength = row.Feedback?.split("\n").reduce((max, feedbackLine) => {
                return Math.max(max, feedbackLine.replace(constants_js_1.STRIP_ANSI_REGEX, "").length);
            }, 0) ?? 0;
            return Math.max(max, maxFeedbackLineLength);
        }, 0);
        defaultColumns.push({
            name: "Feedback",
            alignment: "left",
            minLen: feedbackColumnLength + 8,
        });
    }
    console.log();
    const table = new console_table_printer_1.Table({
        columns: defaultColumns,
        colorMap: {
            grey: "\x1b[90m",
        },
    });
    for (const row of rows) {
        table.addRow(row[0], row[1]);
    }
    const testStatusColor = testStatus.includes("pass")
        ? chalk_1.default.green
        : testStatus.includes("fail")
            ? chalk_1.default.red
            : chalk_1.default.yellow;
    if (testSuiteName) {
        console.log(testStatusColor(`› ${testSuiteName}`));
    }
    if (failureMessage) {
        console.log(failureMessage);
    }
    table.printTable();
    if (experimentUrl) {
        console.log();
        console.log(` [LANGSMITH]: View full results in LangSmith at ${experimentUrl}`);
        console.log();
    }
}
