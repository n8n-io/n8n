export function locationConstraintMiddleware(options) {
    return (next) => async (args) => {
        const { CreateBucketConfiguration } = args.input;
        const region = await options.region();
        if (!CreateBucketConfiguration?.LocationConstraint && !CreateBucketConfiguration?.Location) {
            args = {
                ...args,
                input: {
                    ...args.input,
                    CreateBucketConfiguration: region === "us-east-1" ? undefined : { LocationConstraint: region },
                },
            };
        }
        return next(args);
    };
}
export const locationConstraintMiddlewareOptions = {
    step: "initialize",
    tags: ["LOCATION_CONSTRAINT", "CREATE_BUCKET_CONFIGURATION"],
    name: "locationConstraintMiddleware",
    override: true,
};
export const getLocationConstraintPlugin = (config) => ({
    applyToStack: (clientStack) => {
        clientStack.add(locationConstraintMiddleware(config), locationConstraintMiddlewareOptions);
    },
});
