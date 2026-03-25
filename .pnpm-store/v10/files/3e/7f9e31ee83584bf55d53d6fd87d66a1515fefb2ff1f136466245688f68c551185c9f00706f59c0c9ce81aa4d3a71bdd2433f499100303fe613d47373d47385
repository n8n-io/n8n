"use strict";
/**
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.attachmentZodSchema = void 0;
const zod_1 = require("zod");
/**
 * Zod schema for validating attachments.
 */
exports.attachmentZodSchema = zod_1.z.object({
    contentType: zod_1.z.string().min(1),
    contentUrl: zod_1.z.string().min(1).optional(),
    content: zod_1.z.unknown().optional(),
    name: zod_1.z.string().min(1).optional(),
    thumbnailUrl: zod_1.z.string().min(1).optional()
});
//# sourceMappingURL=attachment.js.map