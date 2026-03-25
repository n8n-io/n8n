export var NearMediaType;
(function (NearMediaType) {
    NearMediaType["Image"] = "Image";
    NearMediaType["Audio"] = "Audio";
    NearMediaType["Video"] = "Video";
    NearMediaType["Thermal"] = "Thermal";
    NearMediaType["Depth"] = "Depth";
    NearMediaType["IMU"] = "IMU";
})(NearMediaType || (NearMediaType = {}));
export default class GraphQLNearMedia {
    constructor(args) {
        this.certainty = args.certainty;
        this.distance = args.distance;
        this.media = args.media;
        this.type = args.type;
        this.targetVectors = args.targetVectors;
    }
    toString(wrap = true) {
        let args = [];
        if (this.media.startsWith('data:')) {
            const base64part = ';base64,';
            this.media = this.media.substring(this.media.indexOf(base64part) + base64part.length);
        }
        args = [...args, `${this.type.toLowerCase()}:${JSON.stringify(this.media)}`];
        if (this.certainty) {
            args = [...args, `certainty:${this.certainty}`];
        }
        if (this.distance) {
            args = [...args, `distance:${this.distance}`];
        }
        if (this.targetVectors && this.targetVectors.length > 0) {
            args = [...args, `targetVectors:${JSON.stringify(this.targetVectors)}`];
        }
        if (!wrap) {
            return `${args.join(',')}`;
        }
        return `{${args.join(',')}}`;
    }
}
