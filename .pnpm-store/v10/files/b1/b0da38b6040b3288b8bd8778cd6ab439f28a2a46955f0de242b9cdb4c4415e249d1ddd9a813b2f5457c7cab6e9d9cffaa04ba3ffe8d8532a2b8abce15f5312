"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.imageExists = imageExists;
const async_lock_1 = __importDefault(require("async-lock"));
const existingImages = new Set();
const imageCheckLock = new async_lock_1.default();
async function imageExists(dockerode, imageName) {
    return imageCheckLock.acquire(imageName.string, async () => {
        if (existingImages.has(imageName.string)) {
            return true;
        }
        try {
            await dockerode.getImage(imageName.string).inspect();
            existingImages.add(imageName.string);
            return true;
        }
        catch (err) {
            if (err instanceof Error && err.message.toLowerCase().includes("no such image")) {
                return false;
            }
            throw err;
        }
    });
}
//# sourceMappingURL=image-exists.js.map