"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.serialize = void 0;
function serialize(components) {
    let buildResult = buildStartUrl(components);
    let urlBuilder;
    try {
        urlBuilder = new URL(buildResult.startUrl);
    }
    catch (error) {
        if (error.message) {
            console.error(error.message + ' ' + buildResult.startUrl);
        }
        return '';
    }
    if (components.scheme !== undefined && !buildResult.temporarySchemeAndHostUsed && !buildResult.temporarySchemeUsed) {
        urlBuilder.protocol = components.scheme.toLowerCase();
    }
    else {
        urlBuilder.protocol = '';
    }
    if (components.host !== undefined && !buildResult.temporarySchemeAndHostUsed && !buildResult.temporaryHostUsed) {
        urlBuilder.host = components.host;
    }
    else {
        urlBuilder.host = '';
    }
    if (components.port) {
        urlBuilder.port = String(components.port);
    }
    if (components.path) {
        urlBuilder.pathname = components.path;
    }
    if (components.userinfo) {
        let parts = components.userinfo.split(':');
        if (parts[0]) {
            urlBuilder.username = parts[0];
        }
        if (parts[1]) {
            urlBuilder.password = parts[1];
        }
    }
    if (components.query) {
        urlBuilder.search = components.query;
    }
    if (components.fragment) {
        urlBuilder.hash = components.fragment;
    }
    let result = urlBuilder.toString();
    if (!components.path && result.endsWith('/')) {
        result = result.slice(0, -1);
    }
    if (buildResult.temporarySchemeAndHostUsed) {
        result = result.replace(temporarySchemeAndHost, '');
        if (result.startsWith('/')) {
            result = result.slice(1);
        }
    }
    if (buildResult.temporaryHostUsed) {
        result = result.replace(temporaryHost, '');
    }
    if (buildResult.temporarySchemeUsed) {
        result = result.replace(temporaryScheme, '');
    }
    return result;
}
exports.serialize = serialize;
const temporaryScheme = 'https:';
const temporaryHost = '_remove_me_host_';
const temporarySchemeAndHost = temporaryScheme + '//' + temporaryHost;
function buildStartUrl(components) {
    let result = {
        startUrl: '',
        temporaryHostUsed: false,
        temporarySchemeUsed: false,
        temporarySchemeAndHostUsed: false,
    };
    if (components.scheme && components.host) {
        result.startUrl = components.scheme + '://' + components.host;
        return result;
    }
    if (components.host) {
        result.temporarySchemeUsed = true;
        result.startUrl = temporaryScheme + components.host;
        return result;
    }
    if (components.scheme) {
        if (components.path) {
            result.startUrl = components.scheme + ':' + components.path;
            return result;
        }
        result.temporaryHostUsed = true;
        result.startUrl = components.scheme + ':' + temporaryHost;
        return result;
    }
    result.temporarySchemeAndHostUsed = true;
    result.startUrl = temporarySchemeAndHost;
    return result;
}
