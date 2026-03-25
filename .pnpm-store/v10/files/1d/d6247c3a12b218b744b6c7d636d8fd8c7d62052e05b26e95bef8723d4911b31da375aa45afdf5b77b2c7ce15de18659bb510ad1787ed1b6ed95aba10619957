export const validate = (str) => typeof str === "string" && str.indexOf("arn:") === 0 && str.split(":").length >= 6;
export const parse = (arn) => {
    const segments = arn.split(":");
    if (segments.length < 6 || segments[0] !== "arn")
        throw new Error("Malformed ARN");
    const [, partition, service, region, accountId, ...resource] = segments;
    return {
        partition,
        service,
        region,
        accountId,
        resource: resource.join(":"),
    };
};
export const build = (arnObject) => {
    const { partition = "aws", service, region, accountId, resource } = arnObject;
    if ([service, region, accountId, resource].some((segment) => typeof segment !== "string")) {
        throw new Error("Input ARN object is invalid");
    }
    return `arn:${partition}:${service}:${region}:${accountId}:${resource}`;
};
