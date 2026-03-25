import { AwsQueryProtocol } from "./AwsQueryProtocol";
export class AwsEc2QueryProtocol extends AwsQueryProtocol {
    options;
    constructor(options) {
        super(options);
        this.options = options;
        const ec2Settings = {
            capitalizeKeys: true,
            flattenLists: true,
            serializeEmptyLists: false,
        };
        Object.assign(this.serializer.settings, ec2Settings);
    }
    useNestedResult() {
        return false;
    }
}
