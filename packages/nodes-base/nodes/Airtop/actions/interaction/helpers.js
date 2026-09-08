export function constructInteractionRequest(index, parameters = {}) {
    const additionalFields = this.getNodeParameter('additionalFields', index);
    const request = {
        ...parameters,
        configuration: {
            ...(parameters.configuration ?? {}),
        },
    };
    if (additionalFields.visualScope) {
        request.configuration.visualAnalysis = {
            scope: additionalFields.visualScope,
        };
    }
    if (additionalFields.waitForNavigation) {
        request.waitForNavigation = true;
        request.configuration.waitForNavigationConfig = {
            waitUntil: additionalFields.waitForNavigation,
        };
    }
    return request;
}
//# sourceMappingURL=helpers.js.map