"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.listTags = void 0;
/*
 * This is a TypeScript port of the original Java version, which was written by
 * Gil Tene as described in
 * https://github.com/HdrHistogram/HdrHistogram
 * and released to the public domain, as explained at
 * http://creativecommons.org/publicdomain/zero/1.0/
 */
const Histogram_1 = require("./Histogram");
const encoding_1 = require("./encoding");
const TAG_PREFIX = "Tag=";
const TAG_PREFIX_LENGTH = "Tag=".length;
/**
 * A histogram log reader.
 * <p>
 * Histogram logs are used to capture full fidelity, per-time-interval
 * histograms of a recorded value.
 * <p>
 * For example, a histogram log can be used to capture high fidelity
 * reaction-time logs for some measured system or subsystem component.
 * Such a log would capture a full reaction time histogram for each
 * logged interval, and could be used to later reconstruct a full
 * HdrHistogram of the measured reaction time behavior for any arbitrary
 * time range within the log, by adding [only] the relevant interval
 * histograms.
 * <h3>Histogram log format:</h3>
 * A histogram log file consists of text lines. Lines beginning with
 * the "#" character are optional and treated as comments. Lines
 * containing the legend (starting with "Timestamp") are also optional
 * and ignored in parsing the histogram log. All other lines must
 * be valid interval description lines. Text fields are delimited by
 * commas, spaces.
 * <p>
 * A valid interval description line contains an optional Tag=tagString
 * text field, followed by an interval description.
 * <p>
 * A valid interval description must contain exactly four text fields:
 * <ul>
 * <li>StartTimestamp: The first field must contain a number parse-able as a Double value,
 * representing the start timestamp of the interval in seconds.</li>
 * <li>intervalLength: The second field must contain a number parse-able as a Double value,
 * representing the length of the interval in seconds.</li>
 * <li>Interval_Max: The third field must contain a number parse-able as a Double value,
 * which generally represents the maximum value of the interval histogram.</li>
 * <li>Interval_Compressed_Histogram: The fourth field must contain a text field
 * parse-able as a Base64 text representation of a compressed HdrHistogram.</li>
 * </ul>
 * The log file may contain an optional indication of a starting time. Starting time
 * is indicated using a special comments starting with "#[StartTime: " and followed
 * by a number parse-able as a double, representing the start time (in seconds)
 * that may be added to timestamps in the file to determine an absolute
 * timestamp (e.g. since the epoch) for each interval.
 */
class HistogramLogReader {
    constructor(logContent, bitBucketSize = 32, useWebAssembly = false) {
        this.lines = splitLines(logContent);
        this.currentLineIndex = 0;
        this.bitBucketSize = bitBucketSize;
        this.useWebAssembly = useWebAssembly;
    }
    /**
     * Read the next interval histogram from the log. Returns a Histogram object if
     * an interval line was found, or null if not.
     * <p>Upon encountering any unexpected format errors in reading the next interval
     * from the file, this method will return a null.
     * @return a DecodedInterval, or a null if no appropriate interval found
     */
    nextIntervalHistogram(rangeStartTimeSec = 0, rangeEndTimeSec = Number.MAX_VALUE) {
        while (this.currentLineIndex < this.lines.length) {
            const currentLine = this.lines[this.currentLineIndex];
            this.currentLineIndex++;
            if (currentLine.startsWith("#[StartTime:")) {
                this.parseStartTimeFromLine(currentLine);
            }
            else if (currentLine.startsWith("#[BaseTime:")) {
                this.parseBaseTimeFromLine(currentLine);
            }
            else if (currentLine.startsWith("#") ||
                currentLine.startsWith('"StartTimestamp"')) {
                // skip legend & meta data for now
            }
            else if (currentLine.includes(",")) {
                const tokens = currentLine.split(",");
                const [firstToken] = tokens;
                let tag;
                if (firstToken.startsWith(TAG_PREFIX)) {
                    tag = firstToken.substring(TAG_PREFIX_LENGTH);
                    tokens.shift();
                }
                else {
                    tag = Histogram_1.NO_TAG;
                }
                const [rawLogTimeStampInSec, rawIntervalLengthSec, , base64Histogram,] = tokens;
                const logTimeStampInSec = Number.parseFloat(rawLogTimeStampInSec);
                if (!this.baseTimeSec) {
                    // No explicit base time noted. Deduce from 1st observed time (compared to start time):
                    if (logTimeStampInSec < this.startTimeSec - 365 * 24 * 3600.0) {
                        // Criteria Note: if log timestamp is more than a year in the past (compared to
                        // StartTime), we assume that timestamps in the log are not absolute
                        this.baseTimeSec = this.startTimeSec;
                    }
                    else {
                        // Timestamps are absolute
                        this.baseTimeSec = 0.0;
                    }
                }
                if (rangeEndTimeSec < logTimeStampInSec) {
                    return null;
                }
                if (logTimeStampInSec < rangeStartTimeSec) {
                    continue;
                }
                const histogram = (0, encoding_1.decodeFromCompressedBase64)(base64Histogram, this.bitBucketSize, this.useWebAssembly);
                histogram.startTimeStampMsec =
                    (this.baseTimeSec + logTimeStampInSec) * 1000;
                const intervalLengthSec = Number.parseFloat(rawIntervalLengthSec);
                histogram.endTimeStampMsec =
                    (this.baseTimeSec + logTimeStampInSec + intervalLengthSec) * 1000;
                histogram.tag = tag;
                return histogram;
            }
        }
        return null;
    }
    parseStartTimeFromLine(line) {
        this.startTimeSec = Number.parseFloat(line.split(" ")[1]);
    }
    parseBaseTimeFromLine(line) {
        this.baseTimeSec = Number.parseFloat(line.split(" ")[1]);
    }
}
const splitLines = (logContent) => logContent.split(/\r\n|\r|\n/g);
const shouldIncludeNoTag = (lines) => lines.find((line) => !line.startsWith("#") &&
    !line.startsWith('"') &&
    !line.startsWith(TAG_PREFIX) &&
    line.includes(","));
const listTags = (content) => {
    const lines = splitLines(content);
    const tags = lines
        .filter((line) => line.includes(",") && line.startsWith(TAG_PREFIX))
        .map((line) => line.substring(TAG_PREFIX_LENGTH, line.indexOf(",")));
    const tagsWithoutDuplicates = new Set(tags);
    const result = Array.from(tagsWithoutDuplicates);
    if (shouldIncludeNoTag(lines)) {
        result.unshift("NO TAG");
    }
    return result;
};
exports.listTags = listTags;
exports.default = HistogramLogReader;
//# sourceMappingURL=HistogramLogReader.js.map