import type { PostBindingContext } from 'samlify/types/src/entity';

/**
 * The auto-submit script needs the response's Content-Security-Policy nonce, or a
 * policy with `script-src` refuses it and the login request is never sent.
 */
export function getInitSSOFormView(context: PostBindingContext, cspNonce: string): string {
	return `
	<form id="saml-form" method="post" action="${context.entityEndpoint}" autocomplete="off">
    <input type="hidden" name="${context.type}" value="${context.context}" />
    ${context.relayState ? '<input type="hidden" name="RelayState" value="{{relayState}}" />' : ''}
</form>
<script type="text/javascript" nonce="${cspNonce}">
    // Automatic form submission
    (function(){
        document.forms[0].submit();
    })();
</script>`;
}
