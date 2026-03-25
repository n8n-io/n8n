import * as $protobuf from "../..";
export const FileDescriptorSet: $protobuf.Type;

export const FileDescriptorProto: $protobuf.Type;

export const DescriptorProto: $protobuf.Type & {
    ExtensionRange: $protobuf.Type,
    ReservedRange: $protobuf.Type
};

export const FieldDescriptorProto: $protobuf.Type & {
    Label: $protobuf.Enum,
    Type: $protobuf.Enum
};

export const OneofDescriptorProto: $protobuf.Type;

export const EnumDescriptorProto: $protobuf.Type;

export const ServiceDescriptorProto: $protobuf.Type;

export const EnumValueDescriptorProto: $protobuf.Type;

export const MethodDescriptorProto: $protobuf.Type;

export const FileOptions: $protobuf.Type & {
    OptimizeMode: $protobuf.Enum
};

export const MessageOptions: $protobuf.Type;

export const FieldOptions: $protobuf.Type & {
    CType: $protobuf.Enum,
    JSType: $protobuf.Enum
};

export const OneofOptions: $protobuf.Type;

export const EnumOptions: $protobuf.Type;

export const EnumValueOptions: $protobuf.Type;

export const ServiceOptions: $protobuf.Type;

export const MethodOptions: $protobuf.Type;

export const UninterpretedOption: $protobuf.Type & {
    NamePart: $protobuf.Type
};

export const SourceCodeInfo: $protobuf.Type & {
    Location: $protobuf.Type
};

export const GeneratedCodeInfo: $protobuf.Type & {
    Annotation: $protobuf.Type
};

export interface IFileDescriptorSet {
    file: IFileDescriptorProto[];
}

export interface IFileDescriptorProto {
    name?: string;
    package?: string;
    dependency?: any;
    publicDependency?: any;
    weakDependency?: any;
    messageType?: IDescriptorProto[];
    enumType?: IEnumDescriptorProto[];
    service?: IServiceDescriptorProto[];
    extension?: IFieldDescriptorProto[];
    options?: IFileOptions;
    sourceCodeInfo?: any;
    syntax?: string;
}

export interface IFileOptions {
    javaPackage?: string;
    javaOuterClassname?: string;
    javaMultipleFiles?: boolean;
    javaGenerateEqualsAndHash?: boolean;
    javaStringCheckUtf8?: boolean;
    optimizeFor?: IFileOptionsOptimizeMode;
    goPackage?: string;
    ccGenericServices?: boolean;
    javaGenericServices?: boolean;
    pyGenericServices?: boolean;
    deprecated?: boolean;
    ccEnableArenas?: boolean;
    objcClassPrefix?: string;
    csharpNamespace?: string;
}

type IFileOptionsOptimizeMode = number;

export interface IDescriptorProto {
    name?: string;
    field?: IFieldDescriptorProto[];
    extension?: IFieldDescriptorProto[];
    nestedType?: IDescriptorProto[];
    enumType?: IEnumDescriptorProto[];
    extensionRange?: IDescriptorProtoExtensionRange[];
    oneofDecl?: IOneofDescriptorProto[];
    options?: IMessageOptions;
    reservedRange?: IDescriptorProtoReservedRange[];
    reservedName?: string[];
}

export interface IMessageOptions {
    mapEntry?: boolean;
}

export interface IDescriptorProtoExtensionRange {
    start?: number;
    end?: number;
}

export interface IDescriptorProtoReservedRange {
    start?: number;
    end?: number;
}

export interface IFieldDescriptorProto {
    name?: string;
    number?: number;
    label?: IFieldDescriptorProtoLabel;
    type?: IFieldDescriptorProtoType;
    typeName?: string;
    extendee?: string;
    defaultValue?: string;
    oneofIndex?: number;
    jsonName?: any;
    options?: IFieldOptions;
}

type IFieldDescriptorProtoLabel = number;

type IFieldDescriptorProtoType = number;

export interface IFieldOptions {
    packed?: boolean;
    jstype?: IFieldOptionsJSType;
}

type IFieldOptionsJSType = number;

export interface IEnumDescriptorProto {
    name?: string;
    value?: IEnumValueDescriptorProto[];
    options?: IEnumOptions;
}

export interface IEnumValueDescriptorProto {
    name?: string;
    number?: number;
    options?: any;
}

export interface IEnumOptions {
    allowAlias?: boolean;
    deprecated?: boolean;
}

export interface IOneofDescriptorProto {
    name?: string;
    options?: any;
}

export interface IServiceDescriptorProto {
    name?: string;
    method?: IMethodDescriptorProto[];
    options?: IServiceOptions;
}

export interface IServiceOptions {
    deprecated?: boolean;
}

export interface IMethodDescriptorProto {
    name?: string;
    inputType?: string;
    outputType?: string;
    options?: IMethodOptions;
    clientStreaming?: boolean;
    serverStreaming?: boolean;
}

export interface IMethodOptions {
    deprecated?: boolean;
}
