import sha1 from './sha1.js';
import v35, { DNS, URL } from './v35.js';
export { DNS, URL } from './v35.js';
function v5(value, namespace, buf, offset) {
    return v35(0x50, sha1, value, namespace, buf, offset);
}
v5.DNS = DNS;
v5.URL = URL;
export default v5;
