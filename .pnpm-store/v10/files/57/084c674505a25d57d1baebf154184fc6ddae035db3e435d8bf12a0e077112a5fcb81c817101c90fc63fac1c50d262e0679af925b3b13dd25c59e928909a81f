export default function isKeyframeRule(rule) {
  return rule.parent && rule.parent.type === 'atrule' && /keyframes$/.test(rule.parent.name)
}
