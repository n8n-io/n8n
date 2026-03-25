"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const globals_1 = require("@jest/globals");
const aws_utils_1 = require("../aws-utils");
(0, globals_1.describe)("test aws utils", () => {
    globals_1.test.each([
        `'�K*��z:event-typechunk'`,
        `':content-typeapplication/json'`,
        `':message-typeevent{"bytes":"eyJldmVudF90eXBlIjoidGV4dC1nZW5lcmF0aW9uIiwiaXNfZmluaXNoZWQiOmZhbHNlLCJ0ZXh0IjoiSGVsbG8ifQ=="}�B@Q�K�;~t:event-typechunk'`,
        `':message-typeevent{"bytes":"eyJldmVudF90eXBlIjoidGV4dC1nZW5lcmF0aW9uIiwiaXNfZmluaXNoZWQiOmZhbHNlLCJ0ZXh0IjoiISJ9"}V�6��K�ش:event-typechunk'`,
    ])("parseAWSEvent ", (event) => {
        (0, globals_1.expect)((0, aws_utils_1.parseAWSEvent)(event)).toMatchSnapshot();
    });
});
