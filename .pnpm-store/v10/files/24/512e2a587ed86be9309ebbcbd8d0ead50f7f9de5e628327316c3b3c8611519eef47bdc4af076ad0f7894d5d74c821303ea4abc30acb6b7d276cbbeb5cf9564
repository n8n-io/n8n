"use strict";
/**
 * Copyright(c) Microsoft Corporation.All rights reserved.
 * Licensed under the MIT License.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.TaskModuleAction = void 0;
/**
 * Represents a task module action.
 */
class TaskModuleAction {
    constructor(title, value) {
        this.type = 'invoke';
        this.title = title;
        let data;
        if (!value) {
            data = JSON.parse('{}');
        }
        else if (typeof value === 'object') {
            data = value;
        }
        else {
            data = JSON.parse(value);
        }
        data.type = 'task/fetch';
        this.value = data;
    }
}
exports.TaskModuleAction = TaskModuleAction;
//# sourceMappingURL=taskModuleAction.js.map