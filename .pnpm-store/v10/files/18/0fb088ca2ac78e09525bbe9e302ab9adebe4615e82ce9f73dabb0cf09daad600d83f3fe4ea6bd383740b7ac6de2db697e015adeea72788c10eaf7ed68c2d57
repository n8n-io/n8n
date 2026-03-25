import { ImageBuildOptions, ImageInspectInfo } from "dockerode";
import { ImageName } from "../../image-name";
export interface ImageClient {
    build(context: string, opts: ImageBuildOptions): Promise<void>;
    pull(imageName: ImageName, opts?: {
        force: boolean;
        platform: string | undefined;
    }): Promise<void>;
    inspect(imageName: ImageName): Promise<ImageInspectInfo>;
    exists(imageName: ImageName): Promise<boolean>;
}
