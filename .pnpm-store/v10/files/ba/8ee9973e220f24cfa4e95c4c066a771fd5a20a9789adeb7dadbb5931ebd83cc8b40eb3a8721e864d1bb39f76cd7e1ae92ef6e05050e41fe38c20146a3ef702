/* eslint-disable prettier/prettier */
/**
 * (C) Copyright IBM Corp. 2019, 2022.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *      http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
import { extname } from 'path';
// This module attempts to identify common content-types based on the filename or header
// It is not exhaustive, and for best results, you should always manually specify the content-type option.
// See the complete list of supported content-types at
// https://cloud.ibm.com/docs/services/speech-to-text?topic=speech-to-text-input#formats
// *some* file types can be identified by the first 3-4 bytes of the file
const headerContentTypes = {
    fLaC: 'audio/flac',
    RIFF: 'audio/wav',
    OggS: 'audio/ogg',
    ID3: 'audio/mp3',
    '\u001aEߣ': 'audio/webm' // String for first four hex's of webm: [1A][45][DF][A3] (https://www.matroska.org/technical/specs/index.html#EBML)
};
const filenameContentTypes = {
    '.mp3': 'audio/mp3',
    '.wav': 'audio/wav',
    '.flac': 'audio/flac',
    '.ogg': 'audio/ogg',
    '.oga': 'audio/ogg',
    '.opus': 'audio/ogg; codec=opus',
    '.webm': 'audio/webm'
};
/**
 * Takes the beginning of an audio file and returns the associated content-type / mime type
 *
 * @param buffer - a Buffer containing at least the first 4 bytes of the file
 * @return sthe contentType or undefined
 */
const fromHeader = (buffer) => {
    const headerStr = buffer
        .slice(0, 4)
        .toString()
        .substr(0, 4);
    // mp3's are only consistent for the first 3 characters
    return (headerContentTypes[headerStr] || headerContentTypes[headerStr.substr(0, 3)]);
};
/**
 * Guess the content type from the filename
 *
 * Note: Blob and File objects include a .type property, but we're ignoring it because it's frequently either
 * incorrect (e.g. video/ogg instead of audio/ogg) or else a different format than what's expected (e.g. audio/x-wav)
 *
 * @param file - a String filename or url, or binary File/Blob object.
 * @returns the content type
 */
const fromFilename = (file) => {
    const ext = extname(
    // eslint-disable-next-line @typescript-eslint/dot-notation
    (typeof file === 'string' && file) || file['name'] || '');
    return filenameContentTypes[ext];
};
export default {
    fromFilename,
    fromHeader
};
