// Copyright (c) Microsoft Corporation. All rights reserved. Licensed under the MIT license.
// See LICENSE in the project root for license information.
import { ApiItemKind } from '../items/ApiItem';
import { ApiClass } from './ApiClass';
import { ApiEntryPoint } from './ApiEntryPoint';
import { ApiMethod } from './ApiMethod';
import { ApiModel } from './ApiModel';
import { ApiNamespace } from './ApiNamespace';
import { ApiPackage } from './ApiPackage';
import { ApiInterface } from './ApiInterface';
import { ApiPropertySignature } from './ApiPropertySignature';
import { ApiMethodSignature } from './ApiMethodSignature';
import { ApiProperty } from './ApiProperty';
import { ApiEnumMember } from './ApiEnumMember';
import { ApiEnum } from './ApiEnum';
import { ApiConstructor } from './ApiConstructor';
import { ApiConstructSignature } from './ApiConstructSignature';
import { ApiFunction } from './ApiFunction';
import { ApiCallSignature } from './ApiCallSignature';
import { ApiIndexSignature } from './ApiIndexSignature';
import { ApiTypeAlias } from './ApiTypeAlias';
import { ApiVariable } from './ApiVariable';
export class Deserializer {
    static deserialize(context, jsonObject) {
        const options = {};
        switch (jsonObject.kind) {
            case ApiItemKind.Class:
                ApiClass.onDeserializeInto(options, context, jsonObject);
                return new ApiClass(options);
            case ApiItemKind.CallSignature:
                ApiCallSignature.onDeserializeInto(options, context, jsonObject);
                return new ApiCallSignature(options);
            case ApiItemKind.Constructor:
                ApiConstructor.onDeserializeInto(options, context, jsonObject);
                return new ApiConstructor(options);
            case ApiItemKind.ConstructSignature:
                ApiConstructSignature.onDeserializeInto(options, context, jsonObject);
                return new ApiConstructSignature(options);
            case ApiItemKind.EntryPoint:
                ApiEntryPoint.onDeserializeInto(options, context, jsonObject);
                return new ApiEntryPoint(options);
            case ApiItemKind.Enum:
                ApiEnum.onDeserializeInto(options, context, jsonObject);
                return new ApiEnum(options);
            case ApiItemKind.EnumMember:
                ApiEnumMember.onDeserializeInto(options, context, jsonObject);
                return new ApiEnumMember(options);
            case ApiItemKind.Function:
                ApiFunction.onDeserializeInto(options, context, jsonObject);
                return new ApiFunction(options);
            case ApiItemKind.IndexSignature:
                ApiIndexSignature.onDeserializeInto(options, context, jsonObject);
                return new ApiIndexSignature(options);
            case ApiItemKind.Interface:
                ApiInterface.onDeserializeInto(options, context, jsonObject);
                return new ApiInterface(options);
            case ApiItemKind.Method:
                ApiMethod.onDeserializeInto(options, context, jsonObject);
                return new ApiMethod(options);
            case ApiItemKind.MethodSignature:
                ApiMethodSignature.onDeserializeInto(options, context, jsonObject);
                return new ApiMethodSignature(options);
            case ApiItemKind.Model:
                return new ApiModel();
            case ApiItemKind.Namespace:
                ApiNamespace.onDeserializeInto(options, context, jsonObject);
                return new ApiNamespace(options);
            case ApiItemKind.Package:
                ApiPackage.onDeserializeInto(options, context, jsonObject);
                return new ApiPackage(options);
            case ApiItemKind.Property:
                ApiProperty.onDeserializeInto(options, context, jsonObject);
                return new ApiProperty(options);
            case ApiItemKind.PropertySignature:
                ApiPropertySignature.onDeserializeInto(options, context, jsonObject);
                return new ApiPropertySignature(options);
            case ApiItemKind.TypeAlias:
                ApiTypeAlias.onDeserializeInto(options, context, jsonObject);
                return new ApiTypeAlias(options);
            case ApiItemKind.Variable:
                ApiVariable.onDeserializeInto(options, context, jsonObject);
                return new ApiVariable(options);
            default:
                throw new Error(`Failed to deserialize unsupported API item type ${JSON.stringify(jsonObject.kind)}`);
        }
    }
}
//# sourceMappingURL=Deserializer.js.map