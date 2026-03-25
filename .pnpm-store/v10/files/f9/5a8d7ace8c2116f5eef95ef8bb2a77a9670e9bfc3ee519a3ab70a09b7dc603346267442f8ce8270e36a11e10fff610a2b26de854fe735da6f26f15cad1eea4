export interface NearMediaBase {
    certainty?: number;
    distance?: number;
    targetVectors?: string[];
}
export interface NearMediaArgs extends NearMediaBase {
    media: string;
    type: NearMediaType;
}
export interface NearImageArgs extends NearMediaBase {
    image: string;
}
export interface NearAudioArgs extends NearMediaBase {
    audio: string;
}
export interface NearVideoArgs extends NearMediaBase {
    video: string;
}
export interface NearThermalArgs extends NearMediaBase {
    thermal: string;
}
export interface NearDepthArgs extends NearMediaBase {
    depth: string;
}
export interface NearIMUArgs extends NearMediaBase {
    imu: string;
}
export declare enum NearMediaType {
    Image = "Image",
    Audio = "Audio",
    Video = "Video",
    Thermal = "Thermal",
    Depth = "Depth",
    IMU = "IMU"
}
export default class GraphQLNearMedia {
    private certainty?;
    private distance?;
    private media;
    private type;
    private targetVectors?;
    constructor(args: NearMediaArgs);
    toString(wrap?: boolean): string;
}
