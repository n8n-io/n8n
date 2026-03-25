// Copyright (c) Microsoft Corporation.
// Licensed under the MIT License.
/**
 * Breeze retriable status codes.
 * @internal
 */
export function isRetriable(statusCode) {
    return (statusCode === 206 || // Partial Accept
        statusCode === 401 || // Unauthorized
        statusCode === 403 || // Forbidden
        statusCode === 408 || // Timeout
        statusCode === 429 || // Too many requests
        statusCode === 439 || // Daily quota exceeded (legacy)
        statusCode === 500 || // Server Error
        statusCode === 502 || // Bad Gateway
        statusCode === 503 || // Server Unavailable
        statusCode === 504 // Gateway Timeout
    );
}
//  Convert ms to c# time span format DD.HH:MM:SS.MMMMMM
export function msToTimeSpan(totalms) {
    if (isNaN(totalms) || totalms < 0) {
        totalms = 0;
    }
    let sec = ((totalms / 1000) % 60).toFixed(7).replace(/0{0,4}$/, "");
    let min = "" + (Math.floor(totalms / (1000 * 60)) % 60);
    let hour = "" + (Math.floor(totalms / (1000 * 60 * 60)) % 24);
    const days = Math.floor(totalms / (1000 * 60 * 60 * 24));
    sec = sec.indexOf(".") < 2 ? "0" + sec : sec;
    min = min.length < 2 ? "0" + min : min;
    hour = hour.length < 2 ? "0" + hour : hour;
    const daysText = days > 0 ? days + "." : "";
    return daysText + hour + ":" + min + ":" + sec;
}
//# sourceMappingURL=breezeUtils.js.map