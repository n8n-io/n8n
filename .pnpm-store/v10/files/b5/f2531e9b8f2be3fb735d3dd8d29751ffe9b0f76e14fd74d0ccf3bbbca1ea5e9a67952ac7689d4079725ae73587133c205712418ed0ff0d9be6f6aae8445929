/*
 * Copyright The OpenTelemetry Authors
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *      https://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
export function getIncompatibilityDetails(existing, otherDescriptor) {
    let incompatibility = '';
    if (existing.unit !== otherDescriptor.unit) {
        incompatibility += `\t- Unit '${existing.unit}' does not match '${otherDescriptor.unit}'\n`;
    }
    if (existing.type !== otherDescriptor.type) {
        incompatibility += `\t- Type '${existing.type}' does not match '${otherDescriptor.type}'\n`;
    }
    if (existing.valueType !== otherDescriptor.valueType) {
        incompatibility += `\t- Value Type '${existing.valueType}' does not match '${otherDescriptor.valueType}'\n`;
    }
    if (existing.description !== otherDescriptor.description) {
        incompatibility += `\t- Description '${existing.description}' does not match '${otherDescriptor.description}'\n`;
    }
    return incompatibility;
}
export function getValueTypeConflictResolutionRecipe(existing, otherDescriptor) {
    return `\t- use valueType '${existing.valueType}' on instrument creation or use an instrument name other than '${otherDescriptor.name}'`;
}
export function getUnitConflictResolutionRecipe(existing, otherDescriptor) {
    return `\t- use unit '${existing.unit}' on instrument creation or use an instrument name other than '${otherDescriptor.name}'`;
}
export function getTypeConflictResolutionRecipe(existing, otherDescriptor) {
    const selector = {
        name: otherDescriptor.name,
        type: otherDescriptor.type,
        unit: otherDescriptor.unit,
    };
    const selectorString = JSON.stringify(selector);
    return `\t- create a new view with a name other than '${existing.name}' and InstrumentSelector '${selectorString}'`;
}
export function getDescriptionResolutionRecipe(existing, otherDescriptor) {
    const selector = {
        name: otherDescriptor.name,
        type: otherDescriptor.type,
        unit: otherDescriptor.unit,
    };
    const selectorString = JSON.stringify(selector);
    return `\t- create a new view with a name other than '${existing.name}' and InstrumentSelector '${selectorString}'
    \t- OR - create a new view with the name ${existing.name} and description '${existing.description}' and InstrumentSelector ${selectorString}
    \t- OR - create a new view with the name ${otherDescriptor.name} and description '${existing.description}' and InstrumentSelector ${selectorString}`;
}
export function getConflictResolutionRecipe(existing, otherDescriptor) {
    // Conflicts that cannot be solved via views.
    if (existing.valueType !== otherDescriptor.valueType) {
        return getValueTypeConflictResolutionRecipe(existing, otherDescriptor);
    }
    if (existing.unit !== otherDescriptor.unit) {
        return getUnitConflictResolutionRecipe(existing, otherDescriptor);
    }
    // Conflicts that can be solved via views.
    if (existing.type !== otherDescriptor.type) {
        // this will automatically solve possible description conflicts.
        return getTypeConflictResolutionRecipe(existing, otherDescriptor);
    }
    if (existing.description !== otherDescriptor.description) {
        return getDescriptionResolutionRecipe(existing, otherDescriptor);
    }
    return '';
}
//# sourceMappingURL=RegistrationConflicts.js.map