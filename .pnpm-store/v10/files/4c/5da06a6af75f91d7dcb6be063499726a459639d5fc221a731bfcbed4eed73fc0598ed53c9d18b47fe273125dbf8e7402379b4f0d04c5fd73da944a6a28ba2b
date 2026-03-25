import Dockerode, { ImageBuildOptions, ImageInspectInfo } from "dockerode";
import { ImageName } from "../../image-name";
import { ImageClient } from "./image-client";
export declare class DockerImageClient implements ImageClient {
    protected readonly dockerode: Dockerode;
    protected readonly indexServerAddress: string;
    private readonly existingImages;
    private readonly imageExistsLock;
    constructor(dockerode: Dockerode, indexServerAddress: string);
    build(context: string, opts: ImageBuildOptions): Promise<void>;
    private createIsDockerIgnoredFunction;
    inspect(imageName: ImageName): Promise<ImageInspectInfo>;
    exists(imageName: ImageName): Promise<boolean>;
    pull(imageName: ImageName, opts?: {
        force: boolean;
        platform: string | undefined;
    }): Promise<void>;
}
