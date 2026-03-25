const skipTags = ["script", "style"];
function prettifySVG(content, tab = "	", depth = 0) {
  let result = "";
  let level = 0;
  content = content.replace(/(\s)*\/>/g, " />");
  while (content.length > 0) {
    const openIndex = content.indexOf("<");
    let closeIndex = content.indexOf(">");
    if (openIndex === -1 && closeIndex === -1) {
      return result;
    }
    if (openIndex === -1 || closeIndex === -1 || closeIndex < openIndex) {
      return null;
    }
    const text = content.slice(0, openIndex);
    const trimmedText = text.trim();
    if (trimmedText.length) {
      if (text.trimStart() !== text && text.trimEnd() !== text) {
        result += trimmedText + "\n" + tab.repeat(level + depth);
      } else {
        result = result.trim() + text;
      }
    }
    content = content.slice(openIndex);
    closeIndex -= openIndex;
    const lastChar = content.slice(closeIndex - 1, closeIndex);
    const isClosing = content.slice(0, 2) === "</";
    let isSelfClosing = lastChar === "/" || lastChar === "?";
    if (isClosing && isSelfClosing) {
      return null;
    }
    const tagName = content.slice(isClosing ? 2 : 1).split(/[\s>]/).shift();
    const ignoreTagContent = !isSelfClosing && !isClosing && skipTags.includes(tagName);
    if (!ignoreTagContent) {
      const nextOpenIndex = content.indexOf("<", 1);
      if (nextOpenIndex !== -1 && nextOpenIndex < closeIndex) {
        return null;
      }
    }
    if (isClosing && tab.length) {
      if (result.slice(0 - tab.length) === tab) {
        result = result.slice(0, result.length - tab.length);
      }
    }
    result += content.slice(0, closeIndex + 1);
    content = content.slice(closeIndex + 1);
    if (ignoreTagContent) {
      const closingIndex = content.indexOf("</" + tagName);
      const closingEnd = content.indexOf(">", closingIndex);
      if (closingIndex < 0 || closingEnd < 0) {
        return null;
      }
      result += content.slice(0, closingEnd + 1);
      content = content.slice(closingEnd + 1);
      isSelfClosing = true;
    }
    if (isClosing) {
      level--;
      if (level < 0) {
        return null;
      }
    } else if (!isSelfClosing) {
      level++;
    }
    result += "\n" + tab.repeat(level + depth);
  }
  return level === 0 ? result : null;
}

export { prettifySVG };
