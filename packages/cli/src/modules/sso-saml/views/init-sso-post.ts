import type { PostBindingContext } from 'samlify/types/src/entity';

/**
 * The auto-submit script needs the response's Content-Security-Policy nonce. Without it,
 * a policy with `script-src` refuses the script and the browser sends no login request.
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
