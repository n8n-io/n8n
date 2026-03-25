'use strict';

import { ensureMinLength, toRFCDateTime, uuid } from '../utils';
import * as faker from './string-regex';

const passwordSymbols = 'qwerty!@#$%^123456';

function emailSample() {
  return 'user@example.com';
}
function idnEmailSample() {
  return 'пошта@укр.нет';
}
function passwordSample(min, max) {
  let res = 'pa$$word';
  if (min > res.length) {
    res += '_';
    res += ensureMinLength(passwordSymbols, min - res.length).substring(0, min - res.length);
  }
  return res;
}

function commonDateTimeSample({ min, max, omitTime, omitDate }) {
  let res = toRFCDateTime(new Date('2019-08-24T14:15:22.123Z'), omitTime, omitDate, false);
  if (res.length < min) {
    console.warn(`Using minLength = ${min} is incorrect with format "date-time"`);
  }
  if (max && res.length > max) {
    console.warn(`Using maxLength = ${max} is incorrect with format "date-time"`);
  }
  return res;
}

function dateTimeSample(min, max) {
  return commonDateTimeSample({ min, max, omitTime: false, omitDate: false });
}

function dateSample(min, max) {
  return commonDateTimeSample({ min, max, omitTime: true, omitDate: false });
}

function timeSample(min, max) {
  return commonDateTimeSample({ min, max, omitTime: false, omitDate: true }).slice(1);
}

function defaultSample(min, max, _propertyName, pattern, enablePatterns = false) {
  if (pattern && enablePatterns) {
    return faker.regexSample(pattern);
  }
  let res = ensureMinLength('string', min);
  if (max && res.length > max) {
    res = res.substring(0, max);
  }
  return res;
}

function ipv4Sample() {
  return '192.168.0.1';
}

function ipv6Sample() {
  return '2001:0db8:85a3:0000:0000:8a2e:0370:7334';
}

function hostnameSample() {
  return 'example.com';
}
function idnHostnameSample() {
  return 'приклад.укр';
}
function uriSample() {
  return 'http://example.com';
}

function uriReferenceSample() {
  return '../dictionary';
}

function uriTemplateSample() {
  return 'http://example.com/{endpoint}';
}

function iriSample() {
  return 'http://example.com/entity/1';
}

function iriReferenceSample() {
  return '/entity/1';
}

function uuidSample(_min, _max, propertyName) {
  return uuid(propertyName || 'id');
}

function jsonPointerSample() {
  return '/json/pointer';
}

function relativeJsonPointerSample() {
  return '1/relative/json/pointer';
}

function regexSample() {
  return '/regex/';
}

const stringFormats = {
  'email': emailSample,
  'idn-email': idnEmailSample, // https://tools.ietf.org/html/rfc6531#section-3.3
  'password': passwordSample,
  'date-time': dateTimeSample,
  'date': dateSample,
  'time': timeSample, // full-time in https://tools.ietf.org/html/rfc3339#section-5.6
  'ipv4': ipv4Sample,
  'ipv6': ipv6Sample,
  'hostname': hostnameSample,
  'idn-hostname': idnHostnameSample, // https://tools.ietf.org/html/rfc5890#section-2.3.2.3
  'iri': iriSample, // https://tools.ietf.org/html/rfc3987
  'iri-reference': iriReferenceSample,
  'uri': uriSample,
  'uri-reference': uriReferenceSample, // either a URI or relative-reference https://tools.ietf.org/html/rfc3986#section-4.1
  'uri-template': uriTemplateSample,
  'uuid': uuidSample,
  'default': defaultSample,
  'json-pointer': jsonPointerSample,
  'relative-json-pointer': relativeJsonPointerSample, // https://tools.ietf.org/html/draft-handrews-relative-json-pointer-01
  'regex': regexSample,
};

export function sampleString(schema, options, spec, context) {
  let format = schema.format || 'default';
  let sampler = stringFormats[format] || defaultSample;
  let propertyName = context && context.propertyName;
  return sampler(
    schema.minLength || 0,
    schema.maxLength,
    propertyName,
    schema.pattern,
    options?.enablePatterns
  );
}
