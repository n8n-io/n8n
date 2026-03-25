"use strict";
/**
 * Copyright(c) Microsoft Corporation.All rights reserved.
 * Licensed under the MIT License.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.actionTypesZodSchema = exports.ActionTypes = void 0;
const zod_1 = require("zod");
/**
 * Enum representing the types of actions.
 */
var ActionTypes;
(function (ActionTypes) {
    /**
     * Opens a URL in the default browser.
     */
    ActionTypes["OpenUrl"] = "openUrl";
    /**
     * Sends a message back to the bot as a simple string.
     */
    ActionTypes["ImBack"] = "imBack";
    /**
     * Sends a message back to the bot with additional data.
     */
    ActionTypes["PostBack"] = "postBack";
    /**
     * Plays an audio file.
     */
    ActionTypes["PlayAudio"] = "playAudio";
    /**
     * Plays a video file.
     */
    ActionTypes["PlayVideo"] = "playVideo";
    /**
     * Displays an image.
     */
    ActionTypes["ShowImage"] = "showImage";
    /**
     * Downloads a file.
     */
    ActionTypes["DownloadFile"] = "downloadFile";
    /**
     * Initiates a sign-in process.
     */
    ActionTypes["Signin"] = "signin";
    /**
     * Initiates a phone call.
     */
    ActionTypes["Call"] = "call";
    /**
     * Sends a message back to the bot with additional metadata.
     */
    ActionTypes["MessageBack"] = "messageBack";
    /**
     * Opens an application.
     */
    ActionTypes["OpenApp"] = "openApp";
})(ActionTypes || (exports.ActionTypes = ActionTypes = {}));
/**
 * Zod schema for validating ActionTypes.
 */
exports.actionTypesZodSchema = zod_1.z.enum(['openUrl', 'imBack', 'postBack', 'playAudio', 'showImage', 'downloadFile', 'signin', 'call', 'messageBack', 'openApp']);
//# sourceMappingURL=actionTypes.js.map