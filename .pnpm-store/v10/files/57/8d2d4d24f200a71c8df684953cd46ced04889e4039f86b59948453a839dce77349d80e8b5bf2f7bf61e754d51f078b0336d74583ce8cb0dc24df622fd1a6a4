"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.logger = void 0;
const winston_1 = require("winston");
const level = process.env.NODE_ENV === 'test' || process.env.NODE_ENV === 'debug'
    ? 'debug'
    : 'info';
exports.logger = (0, winston_1.createLogger)({
    transports: [new winston_1.transports.Console()],
    format: winston_1.format.combine(winston_1.format.colorize(), winston_1.format.timestamp(), winston_1.format.printf(({ timestamp, level, message, service }) => {
        return `[${timestamp}] ${service} ${level}: ${message}`;
    })),
    defaultMeta: {
        service: 'Milvus-sdk-node',
    },
    level,
});
//# sourceMappingURL=logger.js.map