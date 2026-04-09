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
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.stripFileDecorator = stripFileDecorator;
exports.parseRequestBody = parseRequestBody;
const node_fs_1 = require("node:fs");
const querystring = __importStar(require("node:querystring"));
const path = __importStar(require("node:path"));
const FormData = require("form-data");
const KNOWN_BINARY_CONTENT_TYPES_REGEX = /^image\/(png|jpeg|gif|bmp|webp|svg\+xml)|application\/pdf$/;
function stripFileDecorator(payload) {
    return payload.startsWith('$file(') && payload.endsWith(')')
        ? payload.substring(7, payload.length - 2)
        : payload;
}
const appendFileToFormData = (formData, key, item, workflowFilePath) => {
    return new Promise((resolve, reject) => {
        const currentArazzoFileFolder = path.dirname(workflowFilePath);
        const filePath = path.resolve(currentArazzoFileFolder, stripFileDecorator(item));
        (0, node_fs_1.access)(filePath, node_fs_1.constants.F_OK | node_fs_1.constants.R_OK, (err) => {
            if (err) {
                reject(new Error(`File ${filePath} doesn't exist or isn't readable.`));
            }
            else {
                formData.append(key, (0, node_fs_1.createReadStream)(filePath));
                resolve();
            }
        });
    });
};
const appendObjectToFormData = (promises, formData, payload, workflowFilePath, parentKey) => {
    Object.entries(payload).forEach(([key, item]) => {
        const formKey = parentKey ? `${parentKey}[${key}]` : key;
        if (typeof item === 'string' && item.startsWith('$file(') && item.endsWith(')')) {
            promises.push(appendFileToFormData(formData, formKey, item, workflowFilePath));
        }
        else if (Array.isArray(item)) {
            item.forEach((i) => {
                if (typeof i === 'string' && i.startsWith('$file(') && i.endsWith(')')) {
                    promises.push(appendFileToFormData(formData, formKey, i, workflowFilePath));
                }
                else {
                    formData.append(formKey, i.toString());
                }
            });
        }
        else if (typeof item === 'object' && item !== null) {
            appendObjectToFormData(promises, formData, item, workflowFilePath, formKey);
        }
        else if (typeof item === 'string' || typeof item === 'number' || typeof item === 'boolean') {
            formData.append(formKey, item.toString());
        }
    });
};
const getRequestBodyMultipartFormData = async (payload, formData, workflowFilePath) => {
    if (payload && typeof payload === 'object' && !Array.isArray(payload)) {
        const promises = [];
        appendObjectToFormData(promises, formData, payload, workflowFilePath);
        await Promise.all(promises);
    }
};
const getRequestBodyOctetStream = async (payload) => {
    if (typeof payload === 'string' && payload.startsWith('$file(') && payload.endsWith(')')) {
        const filePath = path.resolve(__dirname, '../', stripFileDecorator(payload));
        await new Promise((resolve, reject) => {
            (0, node_fs_1.access)(filePath, node_fs_1.constants.F_OK | node_fs_1.constants.R_OK, (err) => {
                if (err) {
                    const relativePath = path.relative(process.cwd(), filePath);
                    reject(new Error(`File ${relativePath} doesn't exist or isn't readable.`));
                }
                else {
                    resolve(filePath);
                }
            });
        });
        return (0, node_fs_1.createReadStream)(filePath);
    }
    else {
        return payload;
    }
};
async function parseRequestBody(stepRequestBody, ctx) {
    if (!stepRequestBody) {
        return {
            payload: undefined,
            contentType: undefined,
            encoding: undefined,
            replacements: undefined,
        };
    }
    const { payload, contentType } = stepRequestBody;
    if (contentType === 'multipart/form-data') {
        const formData = new FormData();
        const workflowFilePath = path.resolve(ctx.options.workflowPath);
        await getRequestBodyMultipartFormData(payload, formData, workflowFilePath);
        return {
            ...stepRequestBody,
            payload: formData,
            contentType: `multipart/form-data; boundary=${formData.getBoundary()}`,
        };
    }
    else if (contentType === 'application/octet-stream' ||
        (typeof contentType === 'string' && KNOWN_BINARY_CONTENT_TYPES_REGEX.test(contentType))) {
        return {
            ...stepRequestBody,
            payload: await getRequestBodyOctetStream(payload),
            contentType: 'application/octet-stream',
        };
    }
    else if (contentType === 'application/x-www-form-urlencoded' && typeof payload === 'string') {
        return {
            ...stepRequestBody,
            payload: querystring.parse(payload),
            contentType: 'application/x-www-form-urlencoded',
        };
    }
    return stepRequestBody;
}
//# sourceMappingURL=parse-request-body.js.map