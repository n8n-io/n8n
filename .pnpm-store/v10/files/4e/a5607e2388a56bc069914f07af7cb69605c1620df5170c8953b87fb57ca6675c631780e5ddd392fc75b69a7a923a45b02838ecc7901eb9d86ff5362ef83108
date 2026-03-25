"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.preprocessors = exports.rules = void 0;
const assertions_1 = require("../common/assertions");
const struct_1 = require("../common/struct");
const info_contact_1 = require("../common/info-contact");
const info_license_strict_1 = require("../common/info-license-strict");
const operation_operationId_1 = require("../common/operation-operationId");
const tag_description_1 = require("../common/tag-description");
const tags_alphabetical_1 = require("../common/tags-alphabetical");
const channels_kebab_case_1 = require("./channels-kebab-case");
const no_channel_trailing_slash_1 = require("./no-channel-trailing-slash");
exports.rules = {
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    //@ts-ignore TODO: This is depricated property `spec` and should be removed in the future
    spec: struct_1.Struct,
    struct: struct_1.Struct,
    assertions: assertions_1.Assertions,
    'info-contact': info_contact_1.InfoContact,
    'info-license-strict': info_license_strict_1.InfoLicenseStrict,
    'operation-operationId': operation_operationId_1.OperationOperationId,
    'channels-kebab-case': channels_kebab_case_1.ChannelsKebabCase,
    'no-channel-trailing-slash': no_channel_trailing_slash_1.NoChannelTrailingSlash,
    'tag-description': tag_description_1.TagDescription,
    'tags-alphabetical': tags_alphabetical_1.TagsAlphabetical,
};
exports.preprocessors = {};
