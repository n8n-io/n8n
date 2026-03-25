"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const globals_1 = require("@jest/globals");
const webpack_1 = __importDefault(require("webpack"));
(0, globals_1.describe)("test env compatibility", () => {
    (0, globals_1.test)("webpack", (done) => {
        (0, webpack_1.default)({
            mode: "production",
            entry: "./src/index.ts",
            module: {
                rules: [
                    {
                        test: /\.tsx?$/,
                        use: 'ts-loader',
                        exclude: /node_modules/,
                    },
                ],
            },
            resolve: {
                extensions: ['.tsx', '.ts', '.js'],
            },
        }, (err, stats) => {
            done();
            console.log(stats === null || stats === void 0 ? void 0 : stats.toString());
            expect(err).toBe(null);
            expect(stats === null || stats === void 0 ? void 0 : stats.hasErrors()).toBe(false);
        });
    });
});
