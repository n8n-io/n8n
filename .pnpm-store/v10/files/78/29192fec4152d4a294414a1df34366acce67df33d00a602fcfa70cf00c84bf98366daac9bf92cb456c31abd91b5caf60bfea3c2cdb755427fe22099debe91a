// File generated from our OpenAPI spec by Stainless. See CONTRIBUTING.md for details.
import { APIResource } from "../../core/resource.mjs";
import * as FilesAPI from "./files.mjs";
import { Files, } from "./files.mjs";
import * as ModelsAPI from "./models.mjs";
import { Models } from "./models.mjs";
import * as MessagesAPI from "./messages/messages.mjs";
import { Messages, } from "./messages/messages.mjs";
import * as SkillsAPI from "./skills/skills.mjs";
import { Skills, } from "./skills/skills.mjs";
export class Beta extends APIResource {
    constructor() {
        super(...arguments);
        this.models = new ModelsAPI.Models(this._client);
        this.messages = new MessagesAPI.Messages(this._client);
        this.files = new FilesAPI.Files(this._client);
        this.skills = new SkillsAPI.Skills(this._client);
    }
}
Beta.Models = Models;
Beta.Messages = Messages;
Beta.Files = Files;
Beta.Skills = Skills;
//# sourceMappingURL=beta.mjs.map