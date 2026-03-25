import { select, SelectedValue } from 'xpath';
import { uniq, last, zipObject, notEmpty } from './utility';
import { getContext } from './api';
import camelCase from 'camelcase';

interface ExtractorField {
  key: string;
  localPath: string[] | string[][];
  attributes: string[];
  index?: string[];
  attributePath?: string[];
  context?: boolean;
}

export type ExtractorFields = ExtractorField[];

function buildAbsoluteXPath(paths) {
  return paths.reduce((currentPath, name) => {
    let appendedPath = currentPath;
    const isWildcard = name.startsWith('~');
    if (isWildcard) {
      const pathName = name.replace('~', '');
      appendedPath = currentPath + `/*[contains(local-name(), '${pathName}')]`;
    }
    if (!isWildcard) {
      appendedPath = currentPath + `/*[local-name(.)='${name}']`;
    }
    return appendedPath;
  }, '');
}

function buildAttributeXPath(attributes) {
  if (attributes.length === 0) {
    return '/text()';
  }
  if (attributes.length === 1) {
    return `/@${attributes[0]}`;
  }
  const filters = attributes.map(attribute => `name()='${attribute}'`).join(' or ');
  return `/@*[${filters}]`;
}

export const loginRequestFields: ExtractorFields = [
  {
    key: 'request',
    localPath: ['AuthnRequest'],
    attributes: ['ID', 'IssueInstant', 'Destination', 'AssertionConsumerServiceURL']
  },
  {
    key: 'issuer',
    localPath: ['AuthnRequest', 'Issuer'],
    attributes: []
  },
  {
    key: 'nameIDPolicy',
    localPath: ['AuthnRequest', 'NameIDPolicy'],
    attributes: ['Format', 'AllowCreate']
  },
  {
    key: 'authnContextClassRef',
    localPath: ['AuthnRequest', 'AuthnContextClassRef'],
    attributes: []
  },
  {
    key: 'signature',
    localPath: ['AuthnRequest', 'Signature'],
    attributes: [],
    context: true
  }
];

// support two-tiers status code
export const loginResponseStatusFields = [
  {
    key: 'top',
    localPath: ['Response', 'Status', 'StatusCode'],
    attributes: ['Value'],
  },
  {
    key: 'second',
    localPath: ['Response', 'Status', 'StatusCode', 'StatusCode'],
    attributes: ['Value'],
  }
];

// support two-tiers status code
export const logoutResponseStatusFields = [
  {
    key: 'top',
    localPath: ['LogoutResponse', 'Status', 'StatusCode'],
    attributes: ['Value']
  },
  {
    key: 'second',
    localPath: ['LogoutResponse', 'Status', 'StatusCode', 'StatusCode'],
    attributes: ['Value'],
  }
];

export const loginResponseFields: ((assertion: any) => ExtractorFields) = assertion => [
  {
    key: 'conditions',
    localPath: ['Assertion', 'Conditions'],
    attributes: ['NotBefore', 'NotOnOrAfter'],
    shortcut: assertion
  },
  {
    key: 'response',
    localPath: ['Response'],
    attributes: ['ID', 'IssueInstant', 'Destination', 'InResponseTo'],
  },
  {
    key: 'audience',
    localPath: ['Assertion', 'Conditions', 'AudienceRestriction', 'Audience'],
    attributes: [],
    shortcut: assertion
  },
  // {
  //   key: 'issuer',
  //   localPath: ['Response', 'Issuer'],
  //   attributes: []
  // },
  {
    key: 'issuer',
    localPath: ['Assertion', 'Issuer'],
    attributes: [],
    shortcut: assertion
  },
  {
    key: 'nameID',
    localPath: ['Assertion', 'Subject', 'NameID'],
    attributes: [],
    shortcut: assertion
  },
  {
    key: 'sessionIndex',
    localPath: ['Assertion', 'AuthnStatement'],
    attributes: ['AuthnInstant', 'SessionNotOnOrAfter', 'SessionIndex'],
    shortcut: assertion
  },
  {
    key: 'attributes',
    localPath: ['Assertion', 'AttributeStatement', 'Attribute'],
    index: ['Name'],
    attributePath: ['AttributeValue'],
    attributes: [],
    shortcut: assertion
  }
];

export const logoutRequestFields: ExtractorFields = [
  {
    key: 'request',
    localPath: ['LogoutRequest'],
    attributes: ['ID', 'IssueInstant', 'Destination']
  },
  {
    key: 'issuer',
    localPath: ['LogoutRequest', 'Issuer'],
    attributes: []
  },
  {
    key: 'nameID',
    localPath: ['LogoutRequest', 'NameID'],
    attributes: []
  },
  {
    key: 'sessionIndex',
    localPath: ['LogoutRequest', 'SessionIndex'],
    attributes: []
  },
  {
    key: 'signature',
    localPath: ['LogoutRequest', 'Signature'],
    attributes: [],
    context: true
  }
];

export const logoutResponseFields: ExtractorFields = [
  {
    key: 'response',
    localPath: ['LogoutResponse'],
    attributes: ['ID', 'Destination', 'InResponseTo']
  },
  {
    key: 'issuer',
    localPath: ['LogoutResponse', 'Issuer'],
    attributes: []
  },
  {
    key: 'signature',
    localPath: ['LogoutResponse', 'Signature'],
    attributes: [],
    context: true
  }
];

export function extract(context: string, fields) {
  const { dom } = getContext();
  const rootDoc = dom.parseFromString(context);

  return fields.reduce((result: any, field) => {
    // get essential fields
    const key = field.key;
    const localPath = field.localPath;
    const attributes = field.attributes;
    const isEntire = field.context;
    const shortcut = field.shortcut;
    // get optional fields
    const index = field.index;
    const attributePath = field.attributePath;

    // set allowing overriding if there is a shortcut injected
    let targetDoc = rootDoc;

    // if shortcut is used, then replace the doc
    // it's a design for overriding the doc used during runtime
    if (shortcut) {
      targetDoc = dom.parseFromString(shortcut);
    }

    // special case: multiple path
    /*
      {
        key: 'issuer',
        localPath: [
          ['Response', 'Issuer'],
          ['Response', 'Assertion', 'Issuer']
        ],
        attributes: []
      }
     */
    if (localPath.every(path => Array.isArray(path))) {
      const multiXPaths = localPath
        .map(path => {
          // not support attribute yet, so ignore it
          return `${buildAbsoluteXPath(path)}/text()`;
        })
        .join(' | ');

      return {
        ...result,
        [key]: uniq(select(multiXPaths, targetDoc).map((n: Node) => n.nodeValue).filter(notEmpty))
      };
    }
    // eo special case: multiple path

    const baseXPath = buildAbsoluteXPath(localPath);
    const attributeXPath = buildAttributeXPath(attributes);

    // special case: get attributes where some are in child, some are in parent
    /*
      {
        key: 'attributes',
        localPath: ['Response', 'Assertion', 'AttributeStatement', 'Attribute'],
        index: ['Name'],
        attributePath: ['AttributeValue'],
        attributes: []
      }
    */
    if (index && attributePath) {
      // find the index in localpath
      const indexPath = buildAttributeXPath(index);
      const fullLocalXPath = `${baseXPath}${indexPath}`;
      const parentNodes = select(baseXPath, targetDoc);
      // [uid, mail, edupersonaffiliation], ready for aggregate
      const parentAttributes = select(fullLocalXPath, targetDoc).map((n: Attr) => n.value);
      // [attribute, attributevalue]
      const childXPath = buildAbsoluteXPath([last(localPath)].concat(attributePath));
      const childAttributeXPath = buildAttributeXPath(attributes);
      const fullChildXPath = `${childXPath}${childAttributeXPath}`;
      // [ 'test', 'test@example.com', [ 'users', 'examplerole1' ] ]
      const childAttributes = parentNodes.map(node => {
        const nodeDoc = dom.parseFromString(node.toString());
        if (attributes.length === 0) {
          const childValues = select(fullChildXPath, nodeDoc).map((n: Node) => n.nodeValue);
          if (childValues.length === 1) {
            return childValues[0];
          }
          return childValues;
        }
        if (attributes.length > 0) {
          const childValues = select(fullChildXPath, nodeDoc).map((n: Attr) => n.value);
          if (childValues.length === 1) {
            return childValues[0];
          }
          return childValues;
        }
        return null;
      });
      // aggregation
      const obj = zipObject(parentAttributes, childAttributes, false);
      return {
        ...result,
        [key]: obj
      };

    }
    // case: fetch entire content, only allow one existence
    /*
      {
        key: 'signature',
        localPath: ['AuthnRequest', 'Signature'],
        attributes: [],
        context: true
      }
    */
    if (isEntire) {
      const node = select(baseXPath, targetDoc);
      let value: string | string[] | null = null;
      if (node.length === 1) {
        value = node[0].toString();
      }
      if (node.length > 1) {
        value = node.map(n => n.toString());
      }
      return {
        ...result,
        [key]: value
      };
    }

    // case: multiple attribute
    /*
      {
        key: 'nameIDPolicy',
        localPath: ['AuthnRequest', 'NameIDPolicy'],
        attributes: ['Format', 'AllowCreate']
      }
    */
    if (attributes.length > 1) {
      const baseNode = select(baseXPath, targetDoc).map(n => n.toString());
      const childXPath = `${buildAbsoluteXPath([last(localPath)])}${attributeXPath}`;
      const attributeValues = baseNode.map((node: string) => {
        const nodeDoc = dom.parseFromString(node);
        const values = select(childXPath, nodeDoc).reduce((r: any, n: Attr) => {
          r[camelCase(n.name, {locale: 'en-us'})] = n.value;
          return r;
        }, {});
        return values;
      });
      return {
        ...result,
        [key]: attributeValues.length === 1 ? attributeValues[0] : attributeValues
      };
    }
    // case: single attribute
    /*
      {
        key: 'statusCode',
        localPath: ['Response', 'Status', 'StatusCode'],
        attributes: ['Value'],
      }
    */
    if (attributes.length === 1) {
      const fullPath = `${baseXPath}${attributeXPath}`;
      const attributeValues = select(fullPath, targetDoc).map((n: Attr) => n.value);
      return {
        ...result,
        [key]: attributeValues[0]
      };
    }
    // case: zero attribute
    /*
      {
        key: 'issuer',
        localPath: ['AuthnRequest', 'Issuer'],
        attributes: []
      }
    */
    if (attributes.length === 0) {
      let attributeValue: SelectedValue[] | (string | null)[] | null = null;
      const node = select(baseXPath, targetDoc);
      if (node.length === 1) {
        const fullPath = `string(${baseXPath}${attributeXPath})`;
        attributeValue = select(fullPath, targetDoc);
      }
      if (node.length > 1) {
        attributeValue = node.filter((n: Node) => n.firstChild)
          .map((n: Node) => n.firstChild!.nodeValue);
      }
      return {
        ...result,
        [key]: attributeValue
      };
    }

    return result;
  }, {});

}
