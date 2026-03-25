import type { Awaitable, Mutable } from 'element-plus/es/utils';
import type { UploadAjaxError } from './ajax';
import type { ExtractPropTypes } from 'vue';
import type Upload from './upload.vue';
export declare const uploadListTypes: readonly ["text", "picture", "picture-card"];
export declare const genFileId: () => number;
export declare type UploadStatus = 'ready' | 'uploading' | 'success' | 'fail';
export interface UploadProgressEvent extends ProgressEvent {
    percent: number;
}
export interface UploadRequestOptions {
    action: string;
    method: string;
    data: Record<string, string | Blob | [string | Blob, string]>;
    filename: string;
    file: UploadRawFile;
    headers: Headers | Record<string, string | number | null | undefined>;
    onError: (evt: UploadAjaxError) => void;
    onProgress: (evt: UploadProgressEvent) => void;
    onSuccess: (response: any) => void;
    withCredentials: boolean;
}
export interface UploadFile {
    name: string;
    percentage?: number;
    status: UploadStatus;
    size?: number;
    response?: unknown;
    uid: number;
    url?: string;
    raw?: UploadRawFile;
}
export declare type UploadUserFile = Omit<UploadFile, 'status' | 'uid'> & Partial<Pick<UploadFile, 'status' | 'uid'>>;
export declare type UploadFiles = UploadFile[];
export interface UploadRawFile extends File {
    uid: number;
}
export declare type UploadRequestHandler = (options: UploadRequestOptions) => XMLHttpRequest | Promise<unknown>;
export interface UploadHooks {
    beforeUpload: (rawFile: UploadRawFile) => Awaitable<void | undefined | null | boolean | File | Blob>;
    beforeRemove: (uploadFile: UploadFile, uploadFiles: UploadFiles) => Awaitable<boolean>;
    onRemove: (uploadFile: UploadFile, uploadFiles: UploadFiles) => void;
    onChange: (uploadFile: UploadFile, uploadFiles: UploadFiles) => void;
    onPreview: (uploadFile: UploadFile) => void;
    onSuccess: (response: any, uploadFile: UploadFile, uploadFiles: UploadFiles) => void;
    onProgress: (evt: UploadProgressEvent, uploadFile: UploadFile, uploadFiles: UploadFiles) => void;
    onError: (error: Error, uploadFile: UploadFile, uploadFiles: UploadFiles) => void;
    onExceed: (files: File[], uploadFiles: UploadUserFile[]) => void;
}
export declare type UploadData = Mutable<Record<string, any>>;
export declare const uploadBaseProps: {
    readonly action: import("element-plus/es/utils").EpPropFinalized<StringConstructor, unknown, unknown, "#", boolean>;
    readonly headers: {
        readonly type: import("vue").PropType<import("element-plus/es/utils").EpPropMergeType<(new (...args: any[]) => Record<string, any> | Headers) | (() => Record<string, any> | Headers) | ((new (...args: any[]) => Record<string, any> | Headers) | (() => Record<string, any> | Headers))[], unknown, unknown>>; /**
         * @description key name for uploaded file
         */
        readonly required: false;
        readonly validator: ((val: unknown) => boolean) | undefined;
        __epPropKey: true;
    };
    readonly method: import("element-plus/es/utils").EpPropFinalized<StringConstructor, unknown, unknown, "post", boolean>;
    readonly data: import("element-plus/es/utils").EpPropFinalized<(new (...args: any[]) => ((rawFile: UploadRawFile) => Awaitable<UploadData>) | Mutable<Record<string, any>> | Promise<Mutable<Record<string, any>>>) | (() => ((rawFile: UploadRawFile) => Awaitable<UploadData>) | Awaitable<Mutable<Record<string, any>>>) | ((new (...args: any[]) => ((rawFile: UploadRawFile) => Awaitable<UploadData>) | Mutable<Record<string, any>> | Promise<Mutable<Record<string, any>>>) | (() => ((rawFile: UploadRawFile) => Awaitable<UploadData>) | Awaitable<Mutable<Record<string, any>>>))[], unknown, unknown, () => Mutable<{}>, boolean>;
    readonly multiple: import("element-plus/es/utils").EpPropFinalized<BooleanConstructor, unknown, unknown, false, boolean>;
    readonly name: import("element-plus/es/utils").EpPropFinalized<StringConstructor, unknown, unknown, "file", boolean>;
    readonly drag: import("element-plus/es/utils").EpPropFinalized<BooleanConstructor, unknown, unknown, false, boolean>;
    readonly withCredentials: BooleanConstructor;
    readonly showFileList: import("element-plus/es/utils").EpPropFinalized<BooleanConstructor, unknown, unknown, true, boolean>;
    readonly accept: import("element-plus/es/utils").EpPropFinalized<StringConstructor, unknown, unknown, "", boolean>;
    readonly fileList: import("element-plus/es/utils").EpPropFinalized<(new (...args: any[]) => UploadUserFile[]) | (() => UploadUserFile[]) | ((new (...args: any[]) => UploadUserFile[]) | (() => UploadUserFile[]))[], unknown, unknown, () => [], boolean>;
    readonly autoUpload: import("element-plus/es/utils").EpPropFinalized<BooleanConstructor, unknown, unknown, true, boolean>;
    readonly listType: import("element-plus/es/utils").EpPropFinalized<StringConstructor, "text" | "picture" | "picture-card", unknown, "text", boolean>;
    readonly httpRequest: import("element-plus/es/utils").EpPropFinalized<(new (...args: any[]) => UploadRequestHandler) | (() => UploadRequestHandler) | {
        (): UploadRequestHandler;
        new (): any;
        readonly prototype: any;
    } | ((new (...args: any[]) => UploadRequestHandler) | (() => UploadRequestHandler) | {
        (): UploadRequestHandler;
        new (): any;
        readonly prototype: any;
    })[], unknown, unknown, UploadRequestHandler, boolean>;
    readonly disabled: BooleanConstructor;
    readonly limit: NumberConstructor;
};
export declare const uploadProps: {
    readonly beforeUpload: import("element-plus/es/utils").EpPropFinalized<(new (...args: any[]) => (rawFile: UploadRawFile) => Awaitable<void | undefined | null | boolean | File | Blob>) | (() => (rawFile: UploadRawFile) => Awaitable<void | undefined | null | boolean | File | Blob>) | {
        (): (rawFile: UploadRawFile) => Awaitable<void | undefined | null | boolean | File | Blob>;
        new (): any;
        readonly prototype: any;
    } | ((new (...args: any[]) => (rawFile: UploadRawFile) => Awaitable<void | undefined | null | boolean | File | Blob>) | (() => (rawFile: UploadRawFile) => Awaitable<void | undefined | null | boolean | File | Blob>) | {
        (): (rawFile: UploadRawFile) => Awaitable<void | undefined | null | boolean | File | Blob>;
        new (): any;
        readonly prototype: any;
    })[], unknown, unknown, () => void, boolean>;
    readonly beforeRemove: {
        readonly type: import("vue").PropType<(uploadFile: UploadFile, uploadFiles: UploadFiles) => Awaitable<boolean>>; /**
         * @description key name for uploaded file
         */
        readonly required: false;
        readonly validator: ((val: unknown) => boolean) | undefined;
        __epPropKey: true;
    };
    readonly onRemove: import("element-plus/es/utils").EpPropFinalized<(new (...args: any[]) => (uploadFile: UploadFile, uploadFiles: UploadFiles) => void) | (() => (uploadFile: UploadFile, uploadFiles: UploadFiles) => void) | {
        (): (uploadFile: UploadFile, uploadFiles: UploadFiles) => void;
        new (): any;
        readonly prototype: any;
    } | ((new (...args: any[]) => (uploadFile: UploadFile, uploadFiles: UploadFiles) => void) | (() => (uploadFile: UploadFile, uploadFiles: UploadFiles) => void) | {
        (): (uploadFile: UploadFile, uploadFiles: UploadFiles) => void;
        new (): any;
        readonly prototype: any;
    })[], unknown, unknown, () => void, boolean>;
    readonly onChange: import("element-plus/es/utils").EpPropFinalized<(new (...args: any[]) => (uploadFile: UploadFile, uploadFiles: UploadFiles) => void) | (() => (uploadFile: UploadFile, uploadFiles: UploadFiles) => void) | {
        (): (uploadFile: UploadFile, uploadFiles: UploadFiles) => void;
        new (): any;
        readonly prototype: any;
    } | ((new (...args: any[]) => (uploadFile: UploadFile, uploadFiles: UploadFiles) => void) | (() => (uploadFile: UploadFile, uploadFiles: UploadFiles) => void) | {
        (): (uploadFile: UploadFile, uploadFiles: UploadFiles) => void;
        new (): any;
        readonly prototype: any;
    })[], unknown, unknown, () => void, boolean>;
    readonly onPreview: import("element-plus/es/utils").EpPropFinalized<(new (...args: any[]) => (uploadFile: UploadFile) => void) | (() => (uploadFile: UploadFile) => void) | {
        (): (uploadFile: UploadFile) => void;
        new (): any;
        readonly prototype: any;
    } | ((new (...args: any[]) => (uploadFile: UploadFile) => void) | (() => (uploadFile: UploadFile) => void) | {
        (): (uploadFile: UploadFile) => void;
        new (): any;
        readonly prototype: any;
    })[], unknown, unknown, () => void, boolean>;
    readonly onSuccess: import("element-plus/es/utils").EpPropFinalized<(new (...args: any[]) => (response: any, uploadFile: UploadFile, uploadFiles: UploadFiles) => void) | (() => (response: any, uploadFile: UploadFile, uploadFiles: UploadFiles) => void) | {
        (): (response: any, uploadFile: UploadFile, uploadFiles: UploadFiles) => void;
        new (): any;
        readonly prototype: any;
    } | ((new (...args: any[]) => (response: any, uploadFile: UploadFile, uploadFiles: UploadFiles) => void) | (() => (response: any, uploadFile: UploadFile, uploadFiles: UploadFiles) => void) | {
        (): (response: any, uploadFile: UploadFile, uploadFiles: UploadFiles) => void;
        new (): any;
        readonly prototype: any;
    })[], unknown, unknown, () => void, boolean>;
    readonly onProgress: import("element-plus/es/utils").EpPropFinalized<(new (...args: any[]) => (evt: UploadProgressEvent, uploadFile: UploadFile, uploadFiles: UploadFiles) => void) | (() => (evt: UploadProgressEvent, uploadFile: UploadFile, uploadFiles: UploadFiles) => void) | {
        (): (evt: UploadProgressEvent, uploadFile: UploadFile, uploadFiles: UploadFiles) => void;
        new (): any;
        readonly prototype: any;
    } | ((new (...args: any[]) => (evt: UploadProgressEvent, uploadFile: UploadFile, uploadFiles: UploadFiles) => void) | (() => (evt: UploadProgressEvent, uploadFile: UploadFile, uploadFiles: UploadFiles) => void) | {
        (): (evt: UploadProgressEvent, uploadFile: UploadFile, uploadFiles: UploadFiles) => void;
        new (): any;
        readonly prototype: any;
    })[], unknown, unknown, () => void, boolean>;
    readonly onError: import("element-plus/es/utils").EpPropFinalized<(new (...args: any[]) => (error: Error, uploadFile: UploadFile, uploadFiles: UploadFiles) => void) | (() => (error: Error, uploadFile: UploadFile, uploadFiles: UploadFiles) => void) | {
        (): (error: Error, uploadFile: UploadFile, uploadFiles: UploadFiles) => void;
        new (): any;
        readonly prototype: any;
    } | ((new (...args: any[]) => (error: Error, uploadFile: UploadFile, uploadFiles: UploadFiles) => void) | (() => (error: Error, uploadFile: UploadFile, uploadFiles: UploadFiles) => void) | {
        (): (error: Error, uploadFile: UploadFile, uploadFiles: UploadFiles) => void;
        new (): any;
        readonly prototype: any;
    })[], unknown, unknown, () => void, boolean>;
    readonly onExceed: import("element-plus/es/utils").EpPropFinalized<(new (...args: any[]) => (files: File[], uploadFiles: UploadUserFile[]) => void) | (() => (files: File[], uploadFiles: UploadUserFile[]) => void) | {
        (): (files: File[], uploadFiles: UploadUserFile[]) => void;
        new (): any;
        readonly prototype: any;
    } | ((new (...args: any[]) => (files: File[], uploadFiles: UploadUserFile[]) => void) | (() => (files: File[], uploadFiles: UploadUserFile[]) => void) | {
        (): (files: File[], uploadFiles: UploadUserFile[]) => void;
        new (): any;
        readonly prototype: any;
    })[], unknown, unknown, () => void, boolean>;
    readonly action: import("element-plus/es/utils").EpPropFinalized<StringConstructor, unknown, unknown, "#", boolean>;
    readonly headers: {
        readonly type: import("vue").PropType<import("element-plus/es/utils").EpPropMergeType<(new (...args: any[]) => Record<string, any> | Headers) | (() => Record<string, any> | Headers) | ((new (...args: any[]) => Record<string, any> | Headers) | (() => Record<string, any> | Headers))[], unknown, unknown>>; /**
         * @description key name for uploaded file
         */
        readonly required: false;
        readonly validator: ((val: unknown) => boolean) | undefined;
        __epPropKey: true;
    };
    readonly method: import("element-plus/es/utils").EpPropFinalized<StringConstructor, unknown, unknown, "post", boolean>;
    readonly data: import("element-plus/es/utils").EpPropFinalized<(new (...args: any[]) => ((rawFile: UploadRawFile) => Awaitable<UploadData>) | Mutable<Record<string, any>> | Promise<Mutable<Record<string, any>>>) | (() => ((rawFile: UploadRawFile) => Awaitable<UploadData>) | Awaitable<Mutable<Record<string, any>>>) | ((new (...args: any[]) => ((rawFile: UploadRawFile) => Awaitable<UploadData>) | Mutable<Record<string, any>> | Promise<Mutable<Record<string, any>>>) | (() => ((rawFile: UploadRawFile) => Awaitable<UploadData>) | Awaitable<Mutable<Record<string, any>>>))[], unknown, unknown, () => Mutable<{}>, boolean>;
    readonly multiple: import("element-plus/es/utils").EpPropFinalized<BooleanConstructor, unknown, unknown, false, boolean>;
    readonly name: import("element-plus/es/utils").EpPropFinalized<StringConstructor, unknown, unknown, "file", boolean>;
    readonly drag: import("element-plus/es/utils").EpPropFinalized<BooleanConstructor, unknown, unknown, false, boolean>;
    readonly withCredentials: BooleanConstructor;
    readonly showFileList: import("element-plus/es/utils").EpPropFinalized<BooleanConstructor, unknown, unknown, true, boolean>;
    readonly accept: import("element-plus/es/utils").EpPropFinalized<StringConstructor, unknown, unknown, "", boolean>;
    readonly fileList: import("element-plus/es/utils").EpPropFinalized<(new (...args: any[]) => UploadUserFile[]) | (() => UploadUserFile[]) | ((new (...args: any[]) => UploadUserFile[]) | (() => UploadUserFile[]))[], unknown, unknown, () => [], boolean>;
    readonly autoUpload: import("element-plus/es/utils").EpPropFinalized<BooleanConstructor, unknown, unknown, true, boolean>;
    readonly listType: import("element-plus/es/utils").EpPropFinalized<StringConstructor, "text" | "picture" | "picture-card", unknown, "text", boolean>;
    readonly httpRequest: import("element-plus/es/utils").EpPropFinalized<(new (...args: any[]) => UploadRequestHandler) | (() => UploadRequestHandler) | {
        (): UploadRequestHandler;
        new (): any;
        readonly prototype: any;
    } | ((new (...args: any[]) => UploadRequestHandler) | (() => UploadRequestHandler) | {
        (): UploadRequestHandler;
        new (): any;
        readonly prototype: any;
    })[], unknown, unknown, UploadRequestHandler, boolean>;
    readonly disabled: BooleanConstructor;
    readonly limit: NumberConstructor;
};
export declare type UploadProps = ExtractPropTypes<typeof uploadProps>;
export declare type UploadInstance = InstanceType<typeof Upload>;
