
/*
Copyright Â© 2001-2004 World Wide Web Consortium, 
(Massachusetts Institute of Technology, European Research Consortium 
for Informatics and Mathematics, Keio University). All 
Rights Reserved. This work is distributed under the W3CÂ® Software License [1] in the 
hope that it will be useful, but WITHOUT ANY WARRANTY; without even 
the implied warranty of MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. 

[1] http://www.w3.org/Consortium/Legal/2002/copyright-software-20021231
*/



   /**
    *  Gets URI that identifies the test.
    *  @return uri identifier of test
    */
function getTargetURI() {
      return "http://www.w3.org/2001/DOM-Test-Suite/level1/core/hc_nodeappendchildchildexists";
   }

var docsLoaded = -1000000;
var builder = null;

//
//   This function is called by the testing framework before
//      running the test suite.
//
//   If there are no configuration exceptions, asynchronous
//        document loading is started.  Otherwise, the status
//        is set to complete and the exception is immediately
//        raised when entering the body of the test.
//
function setUpPage() {
   setUpPageStatus = 'running';
   try {
     //
     //   creates test document builder, may throw exception
     //
     builder = createConfiguredBuilder();

      docsLoaded = 0;
      
      var docRef = null;
      if (typeof(this.doc) != 'undefined') {
        docRef = this.doc;
      }
      docsLoaded += preload(docRef, "doc", "hc_staff");
        
       if (docsLoaded == 1) {
          setUpPageStatus = 'complete';
       }
    } catch(ex) {
    	catchInitializationError(builder, ex);
        setUpPageStatus = 'complete';
    }
}



//
//   This method is called on the completion of 
//      each asychronous load started in setUpTests.
//
//   When every synchronous loaded document has completed,
//      the page status is changed which allows the
//      body of the test to be executed.
function loadComplete() {
    if (++docsLoaded == 1) {
        setUpPageStatus = 'complete';
    }
}


/**
* 
    If the "newChild" is already in the tree, it is first
    removed before the new one is appended.
    
    Retrieve the "em" second employee and   
    append the first child to the end of the list.   After
    the "appendChild(newChild)" method is invoked the first 
    child should be the one that was second and the last
    child should be the one that was first.

* @author Curt Arnold
* @see http://www.w3.org/TR/1998/REC-DOM-Level-1-19981001/level-one-core#ID-184E7107
* @see http://www.w3.org/Bugs/Public/show_bug.cgi?id=246
*/
function hc_nodeappendchildchildexists() {
   var success;
    if(checkInitialization(builder, "hc_nodeappendchildchildexists") != null) return;
    var doc;
      var elementList;
      var childList;
      var childNode;
      var newChild;
      var memberNode;
      var memberName;
      var refreshedActual = new Array();

      var actual = new Array();

      var nodeType;
      expected = new Array();
      expected[0] = "strong";
      expected[1] = "code";
      expected[2] = "sup";
      expected[3] = "var";
      expected[4] = "acronym";
      expected[5] = "em";

      var appendedChild;
      
      var docRef = null;
      if (typeof(this.doc) != 'undefined') {
        docRef = this.doc;
      }
      doc = load(docRef, "doc", "hc_staff");
      elementList = doc.getElementsByTagName("p");
      childNode = elementList.item(1);
      childList = childNode.getElementsByTagName("*");
      newChild = childList.item(0);
      appendedChild = childNode.appendChild(newChild);
      for(var indexN10085 = 0;indexN10085 < childList.length; indexN10085++) {
      memberNode = childList.item(indexN10085);
      memberName = memberNode.nodeName;

      actual[actual.length] = memberName;

	}
   assertEqualsListAutoCase("element", "liveByTagName",expected,actual);
       childList = childNode.childNodes;

      for(var indexN1009C = 0;indexN1009C < childList.length; indexN1009C++) {
      memberNode = childList.item(indexN1009C);
      nodeType = memberNode.nodeType;

      
	if(
	(1 == nodeType)
	) {
	memberName = memberNode.nodeName;

      refreshedActual[refreshedActual.length] = memberName;

	}
	
	}
   assertEqualsListAutoCase("element", "refreshedChildNodes",expected,refreshedActual);
       
}




function runTest() {
   hc_nodeappendchildchildexists();
}
