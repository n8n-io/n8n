"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ImageName = void 0;
const common_1 = require("../common");
class ImageName {
    registry;
    image;
    tag;
    string;
    static hexRE = /^[0-9a-f]{64}$/i;
    constructor(registry, image, tag) {
        this.registry = registry;
        this.image = image;
        this.tag = tag;
        if (!this.registry && process.env.TESTCONTAINERS_HUB_IMAGE_NAME_PREFIX) {
            const prefix = process.env.TESTCONTAINERS_HUB_IMAGE_NAME_PREFIX;
            // Parse the registry. If it's undefined - then the whole prefix is a registry.
            const parsedRegistry = ImageName.getRegistry(prefix);
            this.registry = parsedRegistry ?? prefix;
            // If the registry is defined, then the imagePrefix is the rest of the prefix.
            let imagePrefix = parsedRegistry ? prefix.substring(prefix.indexOf("/") + 1) : "";
            if (imagePrefix) {
                imagePrefix = imagePrefix.replace(/\/?$/, "/");
            }
            const originalImage = this.image;
            this.image = `${imagePrefix}${this.image}`;
            let message = `Applying changes to image ${originalImage} with tag ${tag}: added registry ${this.registry}`;
            if (this.image !== originalImage) {
                message += ` and changed image to ${this.image}`;
            }
            common_1.log.info(message);
        }
        if (this.registry) {
            if (this.tag.startsWith("sha256:")) {
                this.string = `${this.registry}/${this.image}@${this.tag}`;
            }
            else {
                this.string = `${this.registry}/${this.image}:${this.tag}`;
            }
        }
        else if (this.tag === "latest" && ImageName.hexRE.test(this.image)) {
            // 64 byte hex string. This refers to an image sha256 directly.
            // Do not put the tag as the docker does not accept it.
            // It will fail with:
            //
            //    invalid repository name (<image>), cannot specify 64-byte hexadecimal strings.
            //
            this.string = this.image;
        }
        else if (this.tag.startsWith("sha256:")) {
            this.string = `${this.image}@${this.tag}`;
        }
        else {
            this.string = `${this.image}:${this.tag}`;
        }
    }
    equals(other) {
        return this.registry === other.registry && this.image === other.image && this.tag === other.tag;
    }
    static fromString(string) {
        const registry = this.getRegistry(string);
        const stringWithoutRegistry = registry ? string.split("/").slice(1).join("/") : string;
        if (stringWithoutRegistry.includes("@")) {
            const [image, tag] = stringWithoutRegistry.split("@");
            return new ImageName(registry, image, tag);
        }
        else if (stringWithoutRegistry.includes(":")) {
            const [image, tag] = stringWithoutRegistry.split(":");
            return new ImageName(registry, image, tag);
        }
        else {
            return new ImageName(registry, stringWithoutRegistry, "latest");
        }
    }
    static getRegistry(string) {
        const parts = string.split("/");
        if (parts.length > 1 && this.isRegistry(parts[0])) {
            return parts[0];
        }
    }
    static isRegistry(string) {
        return string.includes(".") || string.includes(":") || string === "localhost";
    }
}
exports.ImageName = ImageName;
//# sourceMappingURL=image-name.js.map