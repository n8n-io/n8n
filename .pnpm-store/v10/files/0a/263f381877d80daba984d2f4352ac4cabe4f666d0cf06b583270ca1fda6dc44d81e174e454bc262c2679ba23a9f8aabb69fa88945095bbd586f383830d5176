"use strict";
// File generated from our OpenAPI spec by Stainless. See CONTRIBUTING.md for details.
Object.defineProperty(exports, "__esModule", { value: true });
exports.Beta = void 0;
const tslib_1 = require("../../internal/tslib.js");
const resource_1 = require("../../core/resource.js");
const FilesAPI = tslib_1.__importStar(require("./files.js"));
const files_1 = require("./files.js");
const ModelsAPI = tslib_1.__importStar(require("./models.js"));
const models_1 = require("./models.js");
const MessagesAPI = tslib_1.__importStar(require("./messages/messages.js"));
const messages_1 = require("./messages/messages.js");
const SkillsAPI = tslib_1.__importStar(require("./skills/skills.js"));
const skills_1 = require("./skills/skills.js");
class Beta extends resource_1.APIResource {
    constructor() {
        super(...arguments);
        this.models = new ModelsAPI.Models(this._client);
        this.messages = new MessagesAPI.Messages(this._client);
        this.files = new FilesAPI.Files(this._client);
        this.skills = new SkillsAPI.Skills(this._client);
    }
}
exports.Beta = Beta;
Beta.Models = models_1.Models;
Beta.Messages = messages_1.Messages;
Beta.Files = files_1.Files;
Beta.Skills = skills_1.Skills;
//# sourceMappingURL=beta.js.map