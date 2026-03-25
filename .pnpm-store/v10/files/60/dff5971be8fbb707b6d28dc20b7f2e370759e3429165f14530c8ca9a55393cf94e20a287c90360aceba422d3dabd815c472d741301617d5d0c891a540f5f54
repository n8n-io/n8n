import {
  pickObjectProps,
  omitObjectProps,
  slash,
  getMatchingStatusCodeRange,
  doesYamlFileExist,
  pickDefined,
} from '../utils';
import { isBrowser } from '../env';
import * as fs from 'fs';
import * as path from 'path';

describe('utils', () => {
  const testObject = {
    a: 'value a',
    b: 'value b',
    c: 'value c',
    d: 'value d',
    e: 'value e',
  };

  describe('pickObjectProps', () => {
    it('returns correct object result', () => {
      expect(pickObjectProps(testObject, ['a', 'b'])).toStrictEqual({ a: 'value a', b: 'value b' });
    });

    it('returns correct object if passed non existing key', () => {
      expect(pickObjectProps(testObject, ['a', 'b', 'nonExisting'])).toStrictEqual({
        a: 'value a',
        b: 'value b',
      });
    });

    it('returns an empty object if no keys are passed', () => {
      expect(pickObjectProps(testObject, [])).toStrictEqual({});
    });

    it('returns an empty object if empty target obj passed', () => {
      expect(pickObjectProps({}, ['d', 'e'])).toStrictEqual({});
    });
  });

  describe('omitObjectProps', () => {
    it('returns correct object result', () => {
      expect(omitObjectProps(testObject, ['a', 'b', 'c'])).toStrictEqual({
        d: 'value d',
        e: 'value e',
      });
    });

    it('returns correct object if passed non existing key', () => {
      expect(omitObjectProps(testObject, ['a', 'b', 'c', 'nonExisting'])).toStrictEqual({
        d: 'value d',
        e: 'value e',
      });
    });

    it('returns full object if no keys are passed', () => {
      expect(omitObjectProps(testObject, [])).toStrictEqual(testObject);
    });

    it('returns an empty object if empty target obj passed', () => {
      expect(omitObjectProps({}, ['d', 'e'])).toStrictEqual({});
    });
  });

  describe('slash path', () => {
    it('can correctly slash path', () => {
      [
        ['foo\\bar', 'foo/bar'],
        ['foo/bar', 'foo/bar'],
        ['foo\\中文', 'foo/中文'],
        ['foo/中文', 'foo/中文'],
      ].forEach(([path, expectRes]) => {
        expect(slash(path)).toBe(expectRes);
      });
    });

    it('does not modify extended length paths', () => {
      const extended = '\\\\?\\some\\path';
      expect(slash(extended)).toBe(extended);
    });
  });

  describe('pickDefined', () => {
    it('returns undefined for undefined', () => {
      expect(pickDefined(undefined)).toBeUndefined();
    });

    it('picks only defined values', () => {
      expect(pickDefined({ a: 1, b: undefined, c: 3 })).toStrictEqual({ a: 1, c: 3 });
    });
  });

  describe('getMatchingStatusCodeRange', () => {
    it('should get the generalized form of status codes', () => {
      expect(getMatchingStatusCodeRange('202')).toEqual('2XX');
      expect(getMatchingStatusCodeRange(400)).toEqual('4XX');
    });
    it('should fail on a wrong input', () => {
      expect(getMatchingStatusCodeRange('2002')).toEqual('2002');
      expect(getMatchingStatusCodeRange(4000)).toEqual('4000');
    });

    describe('isConfigFileExist', () => {
      beforeEach(() => {
        jest
          .spyOn(fs, 'existsSync')
          .mockImplementation((path) => path === 'redocly.yaml' || path === 'redocly.yml');
        jest.spyOn(path, 'extname').mockImplementation((path) => {
          if (path.endsWith('.yaml')) {
            return '.yaml';
          } else if (path.endsWith('.yml')) {
            return '.yml';
          } else {
            return '';
          }
        });
      });

      it('should return true because of valid path provided', () => {
        expect(doesYamlFileExist('redocly.yaml')).toBe(true);
      });

      it('should return true because of valid path provided with yml', () => {
        expect(doesYamlFileExist('redocly.yml')).toBe(true);
      });

      it('should return false because of fail do not exist', () => {
        expect(doesYamlFileExist('redoccccly.yaml')).toBe(false);
      });

      it('should return false because of it is not yaml file', () => {
        expect(doesYamlFileExist('redocly.yam')).toBe(false);
      });
    });

    describe('isBrowser', () => {
      it('should not be browser', () => {
        expect(isBrowser).toBe(false);
      });
    });
  });
});
