"use strict";

const valueParser = require("postcss-value-parser");

function groupByKeyValue(nodes) {
  if (!nodes) {
    return [];
  }

  let groupIndex = 0;

  return nodes.reduce((acc, node, nodeIndex) => {
    const isComma = node.type === "div" && node.value === ",";
    const skipTrailingComma = isComma && nodeIndex === nodes.length - 1;

    if (skipTrailingComma) {
      return acc;
    }

    if (isComma) {
      groupIndex++;
    }

    acc[groupIndex] = acc[groupIndex] || [];

    if (!isComma) {
      acc[groupIndex].push(node);
    }

    return acc;
  }, []);
}

function mapToKeyValue(nodes) {
  const keyVal = nodes.reduce((acc, currentNode, i) => {
    if (acc.length === 1) {
      return acc;
    }

    const nextNode = nodes[i + 1];
    const isNextNodeColon =
      nextNode && nextNode.type === "div" && nextNode.value === ":";

    if (isNextNodeColon) {
      acc.push({
        key: valueParser.stringify(currentNode),
        value: valueParser.stringify(nodes.slice(2)),
        index: currentNode.sourceIndex,
        endIndex: nodes.at(-1).sourceEndIndex
      });

      return acc;
    }

    acc.push({
      value: valueParser.stringify(nodes),
      index: currentNode.sourceIndex,
      endIndex: nodes.at(-1).sourceEndIndex
    });

    return acc;
  }, []);

  return keyVal[0];
}

function parseFunctionArguments(value) {
  const { nodes } = valueParser(value);
  const [firstNode] = nodes;

  if (!firstNode || firstNode.type !== "function") {
    return [];
  }

  return nodes.map(node => groupByKeyValue(node.nodes).map(mapToKeyValue))[0];
}

module.exports = {
  groupByKeyValue,
  mapToKeyValue,
  parseFunctionArguments
};
