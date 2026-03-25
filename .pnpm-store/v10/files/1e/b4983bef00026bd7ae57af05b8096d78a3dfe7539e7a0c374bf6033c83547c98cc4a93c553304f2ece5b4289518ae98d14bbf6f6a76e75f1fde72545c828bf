import type { ShallowRef } from 'vue';
import type { UploadContentInstance } from './upload-content';
import type { UploadFile, UploadFiles, UploadProps, UploadRawFile, UploadStatus } from './upload';
export declare const useHandlers: (props: UploadProps, uploadRef: ShallowRef<UploadContentInstance | undefined>) => {
    /** @description two-way binding ref from props `fileList` */
    uploadFiles: import("vue").Ref<{
        name: string;
        percentage?: number | undefined;
        status: UploadStatus;
        size?: number | undefined;
        response?: unknown;
        uid: number;
        url?: string | undefined;
        raw?: {
            uid: number;
            readonly lastModified: number;
            readonly name: string;
            readonly webkitRelativePath: string;
            readonly size: number;
            readonly type: string;
            arrayBuffer: () => Promise<ArrayBuffer>;
            slice: (start?: number | undefined, end?: number | undefined, contentType?: string | undefined) => Blob;
            stream: () => ReadableStream<any>;
            text: () => Promise<string>;
        } | undefined;
    }[]> | import("vue").WritableComputedRef<UploadFiles>;
    abort: (file: UploadFile) => void;
    clearFiles: (states?: UploadStatus[]) => void;
    handleError: (err: import("./ajax").UploadAjaxError, rawFile: UploadRawFile) => void;
    handleProgress: (evt: import("./upload").UploadProgressEvent, rawFile: UploadRawFile) => void;
    handleStart: (rawFile: UploadRawFile) => void;
    handleSuccess: (response: any, rawFile: UploadRawFile) => unknown;
    handleRemove: (file: UploadRawFile | UploadFile, rawFile?: UploadRawFile | undefined) => void;
    submit: () => void;
    revokeFileObjectURL: (file: UploadFile) => void;
};
