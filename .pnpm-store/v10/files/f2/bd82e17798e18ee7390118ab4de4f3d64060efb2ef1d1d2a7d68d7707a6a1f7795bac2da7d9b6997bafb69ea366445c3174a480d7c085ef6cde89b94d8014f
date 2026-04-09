const ATTR_ESCAPE_RE = /[&<>"]/g;
const ATTR_ESCAPE_MAP = {
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
};
export function escapeAttribute(value) {
    return value.replace(ATTR_ESCAPE_RE, (ch) => ATTR_ESCAPE_MAP[ch]);
}
