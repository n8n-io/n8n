

import {IdentifierRole} from "../parser/tokenizer";
import {TokenType as tt} from "../parser/tokenizer/types";


import Transformer from "./Transformer";

/**
 * Implementation of babel-plugin-transform-react-display-name, which adds a
 * display name to usages of React.createClass and createReactClass.
 */
export default class ReactDisplayNameTransformer extends Transformer {
  constructor(
     rootTransformer,
     tokens,
     importProcessor,
     options,
  ) {
    super();this.rootTransformer = rootTransformer;this.tokens = tokens;this.importProcessor = importProcessor;this.options = options;;
  }

  process() {
    const startIndex = this.tokens.currentIndex();
    if (this.tokens.identifierName() === "createReactClass") {
      const newName =
        this.importProcessor && this.importProcessor.getIdentifierReplacement("createReactClass");
      if (newName) {
        this.tokens.replaceToken(`(0, ${newName})`);
      } else {
        this.tokens.copyToken();
      }
      this.tryProcessCreateClassCall(startIndex);
      return true;
    }
    if (
      this.tokens.matches3(tt.name, tt.dot, tt.name) &&
      this.tokens.identifierName() === "React" &&
      this.tokens.identifierNameAtIndex(this.tokens.currentIndex() + 2) === "createClass"
    ) {
      const newName = this.importProcessor
        ? this.importProcessor.getIdentifierReplacement("React") || "React"
        : "React";
      if (newName) {
        this.tokens.replaceToken(newName);
        this.tokens.copyToken();
        this.tokens.copyToken();
      } else {
        this.tokens.copyToken();
        this.tokens.copyToken();
        this.tokens.copyToken();
      }
      this.tryProcessCreateClassCall(startIndex);
      return true;
    }
    return false;
  }

  /**
   * This is called with the token position at the open-paren.
   */
   tryProcessCreateClassCall(startIndex) {
    const displayName = this.findDisplayName(startIndex);
    if (!displayName) {
      return;
    }

    if (this.classNeedsDisplayName()) {
      this.tokens.copyExpectedToken(tt.parenL);
      this.tokens.copyExpectedToken(tt.braceL);
      this.tokens.appendCode(`displayName: '${displayName}',`);
      this.rootTransformer.processBalancedCode();
      this.tokens.copyExpectedToken(tt.braceR);
      this.tokens.copyExpectedToken(tt.parenR);
    }
  }

   findDisplayName(startIndex) {
    if (startIndex < 2) {
      return null;
    }
    if (this.tokens.matches2AtIndex(startIndex - 2, tt.name, tt.eq)) {
      // This is an assignment (or declaration) and the LHS is either an identifier or a member
      // expression ending in an identifier, so use that identifier name.
      return this.tokens.identifierNameAtIndex(startIndex - 2);
    }
    if (
      startIndex >= 2 &&
      this.tokens.tokens[startIndex - 2].identifierRole === IdentifierRole.ObjectKey
    ) {
      // This is an object literal value.
      return this.tokens.identifierNameAtIndex(startIndex - 2);
    }
    if (this.tokens.matches2AtIndex(startIndex - 2, tt._export, tt._default)) {
      return this.getDisplayNameFromFilename();
    }
    return null;
  }

   getDisplayNameFromFilename() {
    const filePath = this.options.filePath || "unknown";
    const pathSegments = filePath.split("/");
    const filename = pathSegments[pathSegments.length - 1];
    const dotIndex = filename.lastIndexOf(".");
    const baseFilename = dotIndex === -1 ? filename : filename.slice(0, dotIndex);
    if (baseFilename === "index" && pathSegments[pathSegments.length - 2]) {
      return pathSegments[pathSegments.length - 2];
    } else {
      return baseFilename;
    }
  }

  /**
   * We only want to add a display name when this is a function call containing
   * one argument, which is an object literal without `displayName` as an
   * existing key.
   */
   classNeedsDisplayName() {
    let index = this.tokens.currentIndex();
    if (!this.tokens.matches2(tt.parenL, tt.braceL)) {
      return false;
    }
    // The block starts on the {, and we expect any displayName key to be in
    // that context. We need to ignore other other contexts to avoid matching
    // nested displayName keys.
    const objectStartIndex = index + 1;
    const objectContextId = this.tokens.tokens[objectStartIndex].contextId;
    if (objectContextId == null) {
      throw new Error("Expected non-null context ID on object open-brace.");
    }

    for (; index < this.tokens.tokens.length; index++) {
      const token = this.tokens.tokens[index];
      if (token.type === tt.braceR && token.contextId === objectContextId) {
        index++;
        break;
      }

      if (
        this.tokens.identifierNameAtIndex(index) === "displayName" &&
        this.tokens.tokens[index].identifierRole === IdentifierRole.ObjectKey &&
        token.contextId === objectContextId
      ) {
        // We found a displayName key, so bail out.
        return false;
      }
    }

    if (index === this.tokens.tokens.length) {
      throw new Error("Unexpected end of input when processing React class.");
    }

    // If we got this far, we know we have createClass with an object with no
    // display name, so we want to proceed as long as that was the only argument.
    return (
      this.tokens.matches1AtIndex(index, tt.parenR) ||
      this.tokens.matches2AtIndex(index, tt.comma, tt.parenR)
    );
  }
}
