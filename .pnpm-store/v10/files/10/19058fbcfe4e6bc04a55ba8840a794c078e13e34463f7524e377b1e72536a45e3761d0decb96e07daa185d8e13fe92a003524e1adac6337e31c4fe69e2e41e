import { EndpointError } from "../types";
import { evaluateTemplate } from "./evaluateTemplate";
export const getEndpointProperties = (properties, options) => Object.entries(properties).reduce((acc, [propertyKey, propertyVal]) => ({
    ...acc,
    [propertyKey]: group.getEndpointProperty(propertyVal, options),
}), {});
export const getEndpointProperty = (property, options) => {
    if (Array.isArray(property)) {
        return property.map((propertyEntry) => getEndpointProperty(propertyEntry, options));
    }
    switch (typeof property) {
        case "string":
            return evaluateTemplate(property, options);
        case "object":
            if (property === null) {
                throw new EndpointError(`Unexpected endpoint property: ${property}`);
            }
            return group.getEndpointProperties(property, options);
        case "boolean":
            return property;
        default:
            throw new EndpointError(`Unexpected endpoint property type: ${typeof property}`);
    }
};
export const group = {
    getEndpointProperty,
    getEndpointProperties,
};
