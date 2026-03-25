import tagTester from './_tagTester.js';
import { isIE11 } from './_stringTagBug.js';
import { ie11fingerprint, setMethods }  from './_methodFingerprint.js';

export default isIE11 ? ie11fingerprint(setMethods) : tagTester('Set');
