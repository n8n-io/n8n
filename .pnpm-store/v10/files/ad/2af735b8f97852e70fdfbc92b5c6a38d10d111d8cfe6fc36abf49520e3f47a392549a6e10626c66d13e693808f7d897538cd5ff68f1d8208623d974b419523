import { TSSettings } from "./settings";

export type CanBeInvalid = TSSettings extends { throwOnInvalid: true } ? false : true;

export type DefaultValidity = CanBeInvalid extends true ? boolean : true;

export type IfValid<ValidType, InvalidType, ThisIsValid extends boolean | undefined> = ThisIsValid extends true
    ? ValidType
    : ThisIsValid extends false ? InvalidType
    : CanBeInvalid extends true ? ValidType | InvalidType
    : ValidType;

export type Valid = true;
export type Invalid = false;
