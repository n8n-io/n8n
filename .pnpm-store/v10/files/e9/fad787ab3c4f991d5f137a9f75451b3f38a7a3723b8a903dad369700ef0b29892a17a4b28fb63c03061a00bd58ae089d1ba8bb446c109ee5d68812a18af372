"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
/* eslint-disable import/no-extraneous-dependencies */
const reporters_1 = require("@jest/reporters");
const reporter_js_1 = require("../utils/jestlike/reporter.cjs");
class LangSmithEvalReporter extends reporters_1.DefaultReporter {
    async onTestResult(test, testResult, aggregatedResults) {
        if (testResult.failureMessage) {
            console.log(testResult.failureMessage);
        }
        const groupedTestResults = testResult.testResults.reduce((groups, testResult) => {
            const ancestorTitle = testResult.ancestorTitles.join(" > ");
            if (groups[ancestorTitle] === undefined) {
                groups[ancestorTitle] = [];
            }
            groups[ancestorTitle].push(testResult);
            return groups;
        }, {});
        try {
            for (const testGroupName of Object.keys(groupedTestResults)) {
                const resultGroup = groupedTestResults[testGroupName];
                const unskippedTests = resultGroup.filter((result) => result.status !== "pending");
                const overallResult = unskippedTests.length === 0
                    ? "skip"
                    : unskippedTests.every((result) => result.status === "passed")
                        ? "pass"
                        : "fail";
                await (0, reporter_js_1.printReporterTable)(testGroupName, resultGroup, overallResult);
            }
        }
        catch (e) {
            console.log("Failed to display LangSmith eval results:", e.message);
            super.onTestResult(test, testResult, aggregatedResults);
        }
    }
}
exports.default = LangSmithEvalReporter;
