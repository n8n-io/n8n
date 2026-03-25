export const fromCodePoint =
    String.fromCodePoint ||
    function (astralCodePoint: number) {
        return String.fromCharCode(
            Math.floor((astralCodePoint - 0x10000) / 0x400) + 0xd800,
            ((astralCodePoint - 0x10000) % 0x400) + 0xdc00
        );
    };

export const getCodePoint = String.prototype.codePointAt
    ? function (input: string, position: number) {
          return input.codePointAt(position);
      }
    : function (input: string, position: number) {
          return (input.charCodeAt(position) - 0xd800) * 0x400 + input.charCodeAt(position + 1) - 0xdc00 + 0x10000;
      };

export const highSurrogateFrom = 0xd800;
export const highSurrogateTo = 0xdbff;
